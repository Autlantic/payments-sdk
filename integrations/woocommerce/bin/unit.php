<?php

declare(strict_types=1);

/**
 * Pure unit checks for Order_Match and webhook reject dedupe (no WordPress).
 * Usage: php bin/unit.php
 */

$root = dirname(__DIR__);
require_once $root . '/includes/Order_Match.php';
require_once $root . '/includes/Webhook_Controller.php';

use Autlantic\WooCommerce\Order_Match;
use Autlantic\WooCommerce\Webhook_Controller;

$failed = 0;

function expect(bool $cond, string $label) : void
{
    global $failed;
    if ($cond) {
        echo "ok  $label\n";
        return;
    }
    echo "FAIL $label\n";
    $failed++;
}

$meta = [
    'woo_site' => 'https://shop.example/',
    'woo_order_key' => 'wc_order_abc',
    'paymentLinkId' => 'plink_1',
];

expect(
    Order_Match::site_matches($meta, 'https://shop.example'),
    'site_matches ignores trailing slash',
);
expect(
    !Order_Match::site_matches($meta, 'https://other.example/'),
    'site_matches rejects other host',
);
expect(
    Order_Match::order_key_matches($meta, 'wc_order_abc'),
    'order_key_matches',
);
expect(
    !Order_Match::order_key_matches($meta, 'wc_order_other'),
    'order_key rejects mismatch',
);
expect(
    Order_Match::payment_link_matches('plink_1', 'plink_1'),
    'payment_link matches',
);
expect(
    !Order_Match::payment_link_matches('plink_1', 'plink_2'),
    'payment_link mismatch',
);
expect(
    !Order_Match::payment_link_matches('plink_1', ''),
    'payment_link requires both when one set',
);
expect(
    Order_Match::payment_link_matches('', ''),
    'payment_link both empty ok',
);
expect(
    Order_Match::amount_matches(10.0, 10.0),
    'amount exact',
);
expect(
    Order_Match::amount_matches(10.0000004, 10.0),
    'amount within tolerance',
);
expect(
    !Order_Match::amount_matches(9.5, 10.0),
    'amount mismatch',
);

$ok = Order_Match::identity_ok($meta, 'https://shop.example/', 'wc_order_abc', 'plink_1', 'plink_1');
expect(($ok['ok'] ?? false) === true, 'identity_ok pass');

$badSite = Order_Match::identity_ok($meta, 'https://evil.example/', 'wc_order_abc', 'plink_1', 'plink_1');
expect(($badSite['ok'] ?? true) === false && ($badSite['reason'] ?? '') === 'woo_site_mismatch', 'identity site fail');

$paid = Order_Match::payment_paid_ok(26.0, 26.0, 'plink_1', 'plink_1');
expect(($paid['ok'] ?? false) === true, 'payment_paid_ok');

$paidBad = Order_Match::payment_paid_ok(1.0, 26.0, 'plink_1', 'plink_1');
expect(($paidBad['reason'] ?? '') === 'amount_mismatch', 'payment_paid amount fail');

expect(Webhook_Controller::should_log_reject(null) === true, 'dedupe log first time');
expect(Webhook_Controller::should_log_reject(['ok' => false, 'logged' => true]) === false, 'dedupe skip second');
expect(Webhook_Controller::should_log_reject(['ok' => false]) === true, 'dedupe log when not marked');
expect(Webhook_Controller::should_log_reject(['ok' => true]) === false, 'dedupe no log on ok');

if ($failed > 0) {
    fwrite(STDERR, "$failed assertion(s) failed\n");
    exit(1);
}

echo "unit ok\n";
