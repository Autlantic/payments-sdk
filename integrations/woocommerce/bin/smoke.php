<?php

declare(strict_types=1);

/**
 * Packaging smoke: vendored autoload, webhook verify, test/live key mode.
 * Does not call the hosted API.
 */

$root = $argv[1] ?? '';
$autoload = $root . '/vendor/autoload.php';
if ($root === '' || !is_readable($autoload)) {
    fwrite(STDERR, "Usage: php bin/smoke.php <packaged-plugin-dir>\n");
    exit(1);
}

require $autoload;

use Autlantic\Billing\AutlanticBilling;
use Autlantic\Billing\Webhook;

if (!class_exists(AutlanticBilling::class) || !class_exists(Webhook::class)) {
    fwrite(STDERR, "Billing classes missing from packaged autoload\n");
    exit(1);
}

$secret = 'whsec_test';
$body = json_encode([
    'id' => 'evt_smoke',
    'type' => 'payment.paid',
    'data' => ['payment' => ['id' => 'pay_smoke']],
], JSON_THROW_ON_ERROR);
$now = 1_700_000_000;
$signature = Webhook::signBody($secret, $body, $now);
if (!Webhook::verify($secret, $body, $signature, 300, $now)) {
    fwrite(STDERR, "Webhook verify failed\n");
    exit(1);
}
if (Webhook::verify($secret, $body, 'deadbeef', 300, $now)) {
    fwrite(STDERR, "Webhook accepted a bad signature\n");
    exit(1);
}

$event = Webhook::parseEvent($body);
if (($event['type'] ?? '') !== 'payment.paid') {
    fwrite(STDERR, "Webhook parse failed\n");
    exit(1);
}

$test = new AutlanticBilling('abk_test_local');
$live = new AutlanticBilling('abk_live_example');
if ($test->mode !== 'test' || $live->mode !== 'live') {
    fwrite(STDERR, "API key mode detection failed\n");
    exit(1);
}

echo "smoke ok\n";
