<?php

declare(strict_types=1);

namespace Autlantic\Magento\Helper;

use Magento\Sales\Api\Data\OrderInterface;

final class OrderMeta
{
    public const PAYMENT_LINK_ID = 'autlantic_payment_link_id';
    public const PAYMENT_LINK_URL = 'autlantic_payment_link_url';
    public const PAYMENT_ID = 'autlantic_payment_id';
    public const CHECKOUT_URL = 'autlantic_checkout_url';
    public const TX_HASH = 'autlantic_tx_hash';
    public const MERCHANT_REF = 'autlantic_merchant_ref';
    public const MODE = 'autlantic_mode';
    public const INVOICE_ID = 'autlantic_invoice_id';

    public static function set(OrderInterface $order, string $key, string $value): void
    {
        $payment = $order->getPayment();
        if ($payment === null) {
            return;
        }
        $payment->setAdditionalInformation($key, $value);
    }

    public static function get(OrderInterface $order, string $key): string
    {
        $payment = $order->getPayment();
        if ($payment === null) {
            return '';
        }

        return trim((string) $payment->getAdditionalInformation($key));
    }

    public static function amountUsdc(OrderInterface $order): float
    {
        return round((float) $order->getGrandTotal(), 2);
    }

    public static function currencySupported(OrderInterface $order): bool
    {
        $currency = strtoupper((string) $order->getOrderCurrencyCode());

        return in_array($currency, ['USD', 'USDC'], true);
    }
}
