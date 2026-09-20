#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Local smoke: webhook sign/verify via the PHP SDK (no Magento runtime required).
 */

$sdk = dirname(__DIR__, 3) . '/sdks/php/src';
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
echo "smoke ok\n";
