<?php

declare(strict_types=1);

namespace Autlantic\Magento\Model;

use Autlantic\Magento\Helper\Config;
use Autlantic\Magento\Helper\OrderIndex;
use Autlantic\Magento\Helper\OrderMatch;
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
            'payment.refunded' => $this->paymentRefunded($data),
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

        $metadata = is_array($payment['metadata'] ?? null) ? $payment['metadata'] : [];
        $eventLinkId = (string) ($metadata['paymentLinkId'] ?? $payment['paymentLinkId'] ?? '');
        $storedLinkId = OrderMeta::get($order, OrderMeta::PAYMENT_LINK_ID);
        $baseUrl = (string) $order->getStore()->getBaseUrl();
        // Enforce store / increment only when the payload includes them (older links may omit).
        if (trim((string) ($metadata['m2_store'] ?? '')) !== ''
            && !OrderMatch::storeMatches($metadata, $baseUrl)
        ) {
            $order->addCommentToStatusHistory(__('Autlantic payment.paid ignored (m2_store_mismatch).'));
            $this->orderRepository->save($order);

            return;
        }
        if (trim((string) ($metadata['m2_increment_id'] ?? '')) !== ''
            && !OrderMatch::incrementMatches($metadata, (string) $order->getIncrementId())
        ) {
            $order->addCommentToStatusHistory(__('Autlantic payment.paid ignored (m2_increment_mismatch).'));
            $this->orderRepository->save($order);

            return;
        }

        $paidAmount = isset($payment['amountUsdc'])
            ? (float) $payment['amountUsdc']
            : (isset($payment['amount']) ? (float) $payment['amount'] : -1.0);
        $orderTotal = OrderMeta::amountUsdc($order);
        $paidOk = OrderMatch::paymentPaidOk(
            $paidAmount >= 0 ? $paidAmount : $orderTotal,
            $orderTotal,
            $eventLinkId !== '' ? $eventLinkId : null,
            $storedLinkId !== '' ? $storedLinkId : null,
        );
        if (($paidOk['ok'] ?? false) !== true) {
            $reason = (string) ($paidOk['reason'] ?? 'match_failed');
            $order->setState(Order::STATE_HOLDED);
            $holdStatus = $order->getConfig()->getStateDefaultStatus(Order::STATE_HOLDED) ?: 'holded';
            $order->setStatus($holdStatus);
            $order->addCommentToStatusHistory(__(
                'Autlantic payment.paid held: %1 (paid %2, order %3).',
                $reason,
                (string) $paidAmount,
                (string) $orderTotal,
            ));
            $this->orderRepository->save($order);

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
    private function paymentRefunded(array $data): void
    {
        $payment = is_array($data['payment'] ?? null) ? $data['payment'] : $data;
        $paymentId = (string) ($payment['id'] ?? '');
        $order = $this->findOrderFromPayment($payment);
        if ($order === null) {
            return;
        }

        $refundAmount = isset($payment['refundAmountUsdc'])
            ? (float) $payment['refundAmountUsdc']
            : (isset($payment['amountUsdc']) ? (float) $payment['amountUsdc'] : (float) $order->getTotalPaid());

        $this->applyOfflineCreditMemo($order, $refundAmount, $paymentId !== '' ? $paymentId : 'payment', 'payment.refunded');
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

        $this->applyOfflineCreditMemo(
            $order,
            $refundAmount,
            $invoiceId !== '' ? $invoiceId : 'invoice',
            'invoice.refunded',
        );
    }

    private function applyOfflineCreditMemo(Order $order, float $refundAmount, string $refId, string $eventLabel): void
    {
        if ($refundAmount > 0 && $order->canCreditmemo()) {
            try {
                $creditmemo = $this->creditmemoFactory->createByOrder($order);
                $creditmemo->setPaymentRefundDisallowed(true);
                $creditmemo->setOfflineRequested(true);
                $this->creditmemoManagement->refund($creditmemo, true);
            } catch (\Throwable $e) {
                $order->addCommentToStatusHistory(__(
                    'Autlantic %1 (%2) recorded; credit memo failed: %3',
                    $eventLabel,
                    $refId,
                    $e->getMessage(),
                ));
                $this->orderRepository->save($order);

                return;
            }
        }

        $order->addCommentToStatusHistory(__('Autlantic %1 (%2).', $eventLabel, $refId));
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
