<?php

declare(strict_types=1);

namespace Autlantic\Magento\Model;

use Autlantic\Magento\Helper\Config;
use Autlantic\Magento\Helper\OrderMeta;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\DB\TransactionFactory;
use Magento\Sales\Api\OrderRepositoryInterface;
use Magento\Sales\Model\Order;
use Magento\Sales\Model\Service\InvoiceService;

final class EventHandler
{
    public function __construct(
        private readonly OrderRepositoryInterface $orderRepository,
        private readonly SearchCriteriaBuilder $searchCriteriaBuilder,
        private readonly Config $config,
        private readonly InvoiceService $invoiceService,
        private readonly TransactionFactory $transactionFactory,
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
        }
        $order->addCommentToStatusHistory(__('Autlantic invoice.paid (%1).', $invoiceId !== '' ? $invoiceId : 'n/a'));
        $this->markPaid($order, $invoiceId);
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
            try {
                $order = $this->orderRepository->get((int) $orderId);

                return $order instanceof Order ? $order : null;
            } catch (\Throwable) {
            }
        }

        $linkId = (string) ($metadata['paymentLinkId'] ?? '');
        if ($linkId !== '') {
            return $this->findByAdditional(OrderMeta::PAYMENT_LINK_ID, $linkId);
        }

        $merchantRef = (string) ($payment['merchantRef'] ?? '');
        if ($merchantRef !== '' && preg_match('/^m2_([^_]+)/', $merchantRef, $m)) {
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
            try {
                $order = $this->orderRepository->get((int) $orderId);

                return $order instanceof Order ? $order : null;
            } catch (\Throwable) {
            }
        }

        $invoiceId = (string) ($invoice['id'] ?? '');
        if ($invoiceId !== '') {
            return $this->findByAdditional(OrderMeta::INVOICE_ID, $invoiceId);
        }

        return null;
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
            ->addFilter('status', ['pending', 'pending_payment'], 'in')
            ->setPageSize(50)
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
