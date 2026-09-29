#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Local smoke for Magento packaging (no Magento runtime required).
 */

$root = dirname(__DIR__);
$sdk = dirname(__DIR__, 3) . '/sdks/php/src';

$required = [
    $sdk . '/Webhook.php',
    $sdk . '/AutlanticBillingException.php',
    $root . '/Autlantic/Billing/view/frontend/web/js/view/payment/method-renderer/autlantic.js',
    $root . '/Autlantic/Billing/Helper/OrderIndex.php',
    $root . '/Autlantic/Billing/Helper/Config.php',
    $root . '/Autlantic/Billing/Model/EventHandler.php',
    $root . '/Autlantic/Billing/Model/PaymentMethod.php',
    $root . '/Autlantic/Billing/Controller/Webhook/Index.php',
    $root . '/Autlantic/Billing/Controller/Payment/Redirect.php',
    $root . '/Autlantic/Billing/Block/Adminhtml/System/Config/TestConnection.php',
    $root . '/Autlantic/Billing/Block/Adminhtml/System/Config/WebhookInfo.php',
    $root . '/Autlantic/Billing/Controller/Adminhtml/System/Config/TestConnection.php',
];

foreach ($required as $path) {
    if (!is_readable($path)) {
        fwrite(STDERR, "missing: {$path}\n");
        exit(1);
    }
}

$js = (string) file_get_contents(
    $root . '/Autlantic/Billing/view/frontend/web/js/view/payment/method-renderer/autlantic.js',
);
if (!str_contains($js, 'redirectAfterPlaceOrder: false')) {
    fwrite(STDERR, "checkout renderer must disable Magento success redirect\n");
    exit(1);
}

$paymentMethod = (string) file_get_contents($root . '/Autlantic/Billing/Model/PaymentMethod.php');
if (!str_contains($paymentMethod, 'protected $_canRefund = true')) {
    fwrite(STDERR, "PaymentMethod must enable refunds\n");
    exit(1);
}

$webhook = (string) file_get_contents($root . '/Autlantic/Billing/Controller/Webhook/Index.php');
if (!str_contains($webhook, 'verifyWebhookSignature')) {
    fwrite(STDERR, "Webhook controller must verify across store secrets\n");
    exit(1);
}

require $sdk . '/Webhook.php';
require $sdk . '/AutlanticBillingException.php';

use Autlantic\Billing\Webhook;

$secret = 'whsec_test';
$body = json_encode([
    'id' => 'evt_smoke',
    'type' => 'payment.paid',
    'data' => ['payment' => ['id' => 'pay_smoke', 'metadata' => ['m2_order_id' => '1']]],
], JSON_THROW_ON_ERROR);
$sig = Webhook::signBody($secret, $body);
$ok = Webhook::verifyDetailed($secret, $body, $sig);
if (($ok['ok'] ?? false) !== true) {
    fwrite(STDERR, "smoke failed: good signature rejected\n");
    exit(1);
}
$bad = Webhook::verifyDetailed($secret, $body, 't=1,v1=deadbeef');
if (($bad['ok'] ?? false) === true) {
    fwrite(STDERR, "smoke failed: bad signature accepted\n");
    exit(1);
}

$composer = json_decode((string) file_get_contents($root . '/composer.json'), true, 512, JSON_THROW_ON_ERROR);
if (($composer['version'] ?? '') !== '1.1.0') {
    fwrite(STDERR, "composer.json version must be 1.1.0\n");
    exit(1);
}

echo "smoke ok\n";
