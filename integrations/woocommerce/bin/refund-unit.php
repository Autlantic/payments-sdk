<?php

declare(strict_types=1);

/**
 * Pure checks for payment.refunded matching helpers (no WordPress).
 * Usage: php bin/refund-unit.php
 */

$root = dirname(__DIR__);
if (!defined('ABSPATH')) {
    define('ABSPATH', $root . '/');
}
require_once $root . '/includes/Order_Match.php';

use Autlantic\WooCommerce\Order_Match;

$failed = 0;
function expect(bool $cond, string $label): void
{
    global $failed;
    if ($cond) {
        echo "ok  $label\n";
        return;
    }
    echo "FAIL $label\n";
    $failed++;
}

// Refund path still requires identity match before WC refund is applied.
$meta = [
    'woo_site' => 'https://shop.example/',
    'woo_order_key' => 'wc_order_refund',
    'paymentLinkId' => 'plink_r1',
];
$ok = Order_Match::identity_ok($meta, 'https://shop.example/', 'wc_order_refund', 'plink_r1', 'plink_r1');
expect(($ok['ok'] ?? false) === true, 'refund identity_ok');

$paid = Order_Match::payment_paid_ok(26.0, 26.0, 'plink_r1', 'plink_r1');
expect(($paid['ok'] ?? false) === true, 'pre-refund amount still matches');

if ($failed > 0) {
    fwrite(STDERR, "$failed assertion(s) failed\n");
    exit(1);
}
echo "refund-unit ok\n";
