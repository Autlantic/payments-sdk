#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Pure Magento helper unit tests (no Magento runtime).
 */

$root = dirname(__DIR__);
require $root . '/Autlantic/Billing/Helper/OrderMatch.php';

use Autlantic\Magento\Helper\OrderMatch;

function ok(string $name): void
{
    echo "ok  {$name}\n";
}

function fail(string $name, string $why): void
{
    fwrite(STDERR, "fail {$name}: {$why}\n");
    exit(1);
}

$meta = [
    'm2_store' => 'https://shop.example/',
    'm2_increment_id' => '100000001',
];

if (!OrderMatch::storeMatches($meta, 'https://shop.example')) {
    fail('store_matches', 'trailing slash should match');
}
ok('store_matches ignores trailing slash');

if (OrderMatch::storeMatches($meta, 'https://other.example/')) {
    fail('store_matches reject', 'other host accepted');
}
ok('store_matches rejects other host');

if (!OrderMatch::incrementMatches($meta, '100000001')) {
    fail('increment', 'expected match');
}
ok('increment_matches');

if (OrderMatch::incrementMatches($meta, '100000002')) {
    fail('increment reject', 'mismatch accepted');
}
ok('increment rejects mismatch');

if (!OrderMatch::paymentLinkMatches('plink_a', 'plink_a')) {
    fail('plink', 'match');
}
ok('payment_link matches');

if (OrderMatch::paymentLinkMatches('plink_a', 'plink_b')) {
    fail('plink mismatch', 'accepted');
}
ok('payment_link mismatch');

if (!OrderMatch::paymentLinkMatches('', '')) {
    fail('plink empty', 'both empty should pass');
}
ok('payment_link both empty ok');

if (OrderMatch::paymentLinkMatches('plink_a', '')) {
    fail('plink one side', 'should fail');
}
ok('payment_link requires both when one set');

if (!OrderMatch::amountMatches(10.0, 10.0)) {
    fail('amount exact', 'failed');
}
ok('amount exact');

if (!OrderMatch::amountMatches(10.0, 10.0000005)) {
    fail('amount tol', 'within tolerance');
}
ok('amount within tolerance');

if (OrderMatch::amountMatches(10.0, 11.0)) {
    fail('amount mismatch', 'accepted');
}
ok('amount mismatch');

$id = OrderMatch::identityOk($meta, 'https://shop.example/', '100000001', 'plink_a', 'plink_a');
if (($id['ok'] ?? false) !== true) {
    fail('identity_ok', (string) ($id['reason'] ?? 'no'));
}
ok('identity_ok pass');

$idBad = OrderMatch::identityOk($meta, 'https://evil.example/', '100000001', 'plink_a', 'plink_a');
if (($idBad['ok'] ?? false) === true) {
    fail('identity store fail', 'should fail');
}
ok('identity store fail');

$paid = OrderMatch::paymentPaidOk(19.99, 19.99, 'plink_a', 'plink_a');
if (($paid['ok'] ?? false) !== true) {
    fail('payment_paid_ok', (string) ($paid['reason'] ?? ''));
}
ok('payment_paid_ok');

$paidBad = OrderMatch::paymentPaidOk(5.0, 19.99, 'plink_a', 'plink_a');
if (($paidBad['ok'] ?? false) === true) {
    fail('payment_paid amount', 'should fail');
}
ok('payment_paid amount fail');

echo "unit ok\n";
