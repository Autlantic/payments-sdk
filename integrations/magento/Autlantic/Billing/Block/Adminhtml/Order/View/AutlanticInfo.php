<?php

declare(strict_types=1);

namespace Autlantic\Magento\Block\Adminhtml\Order\View;

use Autlantic\Magento\Helper\OrderMeta;
use Magento\Backend\Block\Template;
use Magento\Backend\Block\Template\Context;
use Magento\Framework\Registry;
use Magento\Sales\Model\Order;

class AutlanticInfo extends Template
{
    public function __construct(
        Context $context,
        private readonly Registry $registry,
        array $data = [],
    ) {
        parent::__construct($context, $data);
    }

    public function getOrder(): ?Order
    {
        $order = $this->registry->registry('current_order');

        return $order instanceof Order ? $order : null;
    }

    /**
     * @return array<string, string>
     */
    public function getRows(): array
    {
        $order = $this->getOrder();
        if ($order === null || $order->getPayment()?->getMethod() !== 'autlantic') {
            return [];
        }

        $rows = [
            (string) __('Mode') => OrderMeta::get($order, OrderMeta::MODE),
            (string) __('Payment link') => OrderMeta::get($order, OrderMeta::PAYMENT_LINK_ID),
            (string) __('Payment') => OrderMeta::get($order, OrderMeta::PAYMENT_ID),
            (string) __('Invoice') => OrderMeta::get($order, OrderMeta::INVOICE_ID),
            (string) __('Tx hash') => OrderMeta::get($order, OrderMeta::TX_HASH),
            (string) __('Merchant ref') => OrderMeta::get($order, OrderMeta::MERCHANT_REF),
        ];

        return array_filter($rows, static fn (string $v): bool => $v !== '');
    }

    public function getCheckoutUrl(): string
    {
        $order = $this->getOrder();
        if ($order === null || $order->hasInvoices()) {
            return '';
        }

        return OrderMeta::get($order, OrderMeta::CHECKOUT_URL);
    }
}
