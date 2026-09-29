<?php

declare(strict_types=1);

namespace Autlantic\Magento\Model;

use Autlantic\Magento\Helper\Config;
use Autlantic\Magento\Helper\OrderIndex;
use Autlantic\Magento\Helper\OrderMeta;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\DB\TransactionFactory;
use Magento\Sales\Api\CreditmemoManagementInterface;
use Magento\Sales\Api\OrderRepositoryInterface;
use Magento\Sales\Model\Order;
use Magento\Sales\Model\Order\CreditmemoFactory;
use Magento\Sales\Model\Service\InvoiceService;

final class EventHandler
{
    public function __construct(
        private readonly OrderRepositoryInterface $orderRepository,
        private readonly SearchCriteriaBuilder $searchCriteriaBuilder,
        private readonly Config $config,
        private readonly InvoiceService $invoiceService,
        private readonly TransactionFactory $transactionFactory,
        private readonly OrderIndex $orderIndex,
        private readonly CreditmemoFactory $creditmemoFactory,
        private readonly CreditmemoManagementInterface $creditmemoManagement,
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public function handle(string $type, array $data): void
    {
        match ($type) {
            'payment.paid' => $this->paymentPaid($data),
            'invoice.paid' => $this->invoicePaid($data),
            'invoice.payment_failed' => $this->invoicePaymentFailed($data),
            'invoice.refunded' => $this->invoiceRefunded($data),
            default => null,
        };
    }

    /**
     * @param array<string, mixed> $data
     */
    private function paymentPaid(array $data): void
    {
        $payment = is_array($data['payment'] ?? null) ? $data['payment'] : $data;
        $order = $this->findOrderFromPayment($payment);
        if ($order === null || $order->hasInvoices()) {
            return;
        }

        $paymentId = (string) ($payment['id'] ?? '');
        $tx = (string) ($payment['txHash'] ?? '');
        if ($paymentId !== '') {
            OrderMeta::set($order, OrderMeta::PAYMENT_ID, $paymentId);
            $this->orderIndex->remember('payment', $paymentId, (int) $order->getEntityId());
        }
        if ($tx !== '') {
            OrderMeta::set($order, OrderMeta::TX_HASH, $tx);
        }

        $order->addCommentToStatusHistory(__(
            'Autlantic payment.paid (%1). Tx: %2',
            $paymentId !== '' ? $paymentId : 'n/a',
            $tx !== '' ? $tx : 'n/a',
        ));
        $this->markPaid($order, $paymentId !== '' ? $paymentId : $tx);
    }

    /**
     * @param array<string, mixed> $data
     */
    private function invoicePaid(array $data): void
    {
        $invoice = is_array($data['invoice'] ?? null) ? $data['invoice'] : $data;
        $invoiceId = (string) ($invoice['id'] ?? '');
        $order = $this->findOrderFromInvoice($invoice);
        if ($order === null || $order->hasInvoices()) {
            return;
        }
        if ($invoiceId !== '') {
            OrderMeta::set($order, OrderMeta::INVOICE_ID, $invoiceId);
            $this->orderIndex->remember('invoice', $invoiceId, (int) $order->getEntityId());
        }
        $order->addCommentToStatusHistory(__('Autlantic invoice.paid (%1).', $invoiceId !== '' ? $invoiceId : 'n/a'));
        $this->markPaid($order, $invoiceId);
    }

    /**
     * @param array<string, mixed> $data
     */
    private function invoicePaymentFailed(array $data): void
    {
        $invoice = is_array($data['invoice'] ?? null) ? $data['invoice'] : $data;
        $order = $this->findOrderFromInvoice($invoice);
        if ($order === null) {
            return;
        }
        $order->addCommentToStatusHistory(__('Autlantic invoice.payment_failed.'));
        $this->orderRepository->save($order);
    }

    /**
     * @param array<string, mixed> $data
     */
    private function invoiceRefunded(array $data): void
    {
        $invoice = is_array($data['invoice'] ?? null) ? $data['invoice'] : $data;
        $invoiceId = (string) ($invoice['id'] ?? '');
        $order = $this->findOrderFromInvoice($invoice);
        if ($order === null) {
            return;
        }

        $refundAmount = isset($invoice['refundAmountUsdc'])
            ? (float) $invoice['refundAmountUsdc']
            : (float) $order->getTotalPaid();

        if ($refundAmount > 0 && $order->canCreditmemo()) {
            try {
                $creditmemo = $this->creditmemoFactory->createByOrder($order);
                if (abs((float) $creditmemo->getGrandTotal() - $refundAmount) > 0.009) {
                    // Full offline credit memo when amounts differ; Magento item allocation is complex.
                    $creditmemo = $this->creditmemoFactory->createByOrder($order);
                }
                $creditmemo->setPaymentRefundDisallowed(true);
                $creditmemo->setOfflineRequested(true);
                $this->creditmemoManagement->refund($creditmemo, true);
            } catch (\Throwable $e) {
                $order->addCommentToStatusHistory(__(
                    'Autlantic invoice.refunded (%1) recorded; credit memo failed: %2',
                    $invoiceId !== '' ? $invoiceId : 'n/a',
                    $e->getMessage(),
                ));
                $this->orderRepository->save($order);

                return;
            }
        }

        $order->addCommentToStatusHistory(__(
            'Autlantic invoice.refunded (%1).',
            $invoiceId !== '' ? $invoiceId : 'n/a',
        ));
        $this->orderRepository->save($order);
    }

    private function markPaid(Order $order, string $transactionId): void
    {
        if ($order->canInvoice()) {
            $invoice = $this->invoiceService->prepareInvoice($order);
            $invoice->setRequestedCaptureCase(\Magento\Sales\Model\Order\Invoice::CAPTURE_OFFLINE);
            if ($transactionId !== '') {
                $invoice->setTransactionId($transactionId);
            }
            $invoice->register();
            $transaction = $this->transactionFactory->create();
            $transaction->addObject($invoice)->addObject($invoice->getOrder())->save();
        }

        $status = $this->config->getPaidStatus((int) $order->getStoreId());
        $state = $status === 'complete' ? Order::STATE_COMPLETE : Order::STATE_PROCESSING;
        $order->setState($state)->setStatus($status);
        $this->orderRepository->save($order);
    }

    /**
     * @param array<string, mixed> $payment
     */
    private function findOrderFromPayment(array $payment): ?Order
    {
        $metadata = is_array($payment['metadata'] ?? null) ? $payment['metadata'] : [];
        $orderId = (string) ($metadata['m2_order_id'] ?? '');
        if ($orderId !== '') {
            return $this->getOrder((int) $orderId);
        }

        $paymentId = (string) ($payment['id'] ?? '');
        if ($paymentId !== '') {
            $indexed = $this->orderIndex->findOrderId('payment', $paymentId);
            if ($indexed !== null) {
                return $this->getOrder($indexed);
            }
        }

        $linkId = (string) ($metadata['paymentLinkId'] ?? $payment['paymentLinkId'] ?? '');
        if ($linkId !== '') {
            $indexed = $this->orderIndex->findOrderId('payment_link', $linkId);
            if ($indexed !== null) {
                return $this->getOrder($indexed);
            }

            return $this->findByAdditional(OrderMeta::PAYMENT_LINK_ID, $linkId);
        }

        $merchantRef = (string) ($payment['merchantRef'] ?? '');
        if ($merchantRef !== '' && preg_match('/^m2_(.+)$/', $merchantRef, $m)) {
            return $this->findByIncrementId($m[1]);
        }

        return null;
    }

    /**
     * @param array<string, mixed> $invoice
     */
    private function findOrderFromInvoice(array $invoice): ?Order
    {
        $metadata = is_array($invoice['metadata'] ?? null) ? $invoice['metadata'] : [];
        $orderId = (string) ($metadata['m2_order_id'] ?? '');
        if ($orderId !== '') {
            return $this->getOrder((int) $orderId);
        }

        $invoiceId = (string) ($invoice['id'] ?? '');
        if ($invoiceId !== '') {
            $indexed = $this->orderIndex->findOrderId('invoice', $invoiceId);
            if ($indexed !== null) {
                return $this->getOrder($indexed);
            }

            return $this->findByAdditional(OrderMeta::INVOICE_ID, $invoiceId);
        }

        return null;
    }

    private function getOrder(int $orderId): ?Order
    {
        if ($orderId <= 0) {
            return null;
        }
        try {
            $order = $this->orderRepository->get($orderId);

            return $order instanceof Order ? $order : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function findByIncrementId(string $incrementId): ?Order
    {
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('increment_id', $incrementId)
            ->create();
        $items = $this->orderRepository->getList($criteria)->getItems();
        $order = reset($items);

        return $order instanceof Order ? $order : null;
    }

    private function findByAdditional(string $key, string $value): ?Order
    {
        // Fallback only. Prefer OrderIndex.
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('status', ['pending', 'pending_payment', 'processing'], 'in')
            ->setPageSize(100)
            ->create();
        foreach ($this->orderRepository->getList($criteria)->getItems() as $order) {
            if (!$order instanceof Order) {
                continue;
            }
            if (OrderMeta::get($order, $key) === $value) {
                return $order;
            }
        }

        return null;
    }
}
