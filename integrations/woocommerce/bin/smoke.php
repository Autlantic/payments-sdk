<?php

declare(strict_types=1);

/**
 * Packaging smoke: vendored autoload, webhook verify, key mode, WP transport path.
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
use Autlantic\Billing\Transport;
use Autlantic\Billing\Webhook;
use Autlantic\Billing\WordPressTransport;

if (!class_exists(AutlanticBilling::class) || !class_exists(Webhook::class)) {
    fwrite(STDERR, "Billing classes missing from packaged autoload\n");
    exit(1);
}

if (class_exists(\Autlantic\Billing\CurlTransport::class, false)
    || is_readable($root . '/vendor/autlantic/billing/src/CurlTransport.php')) {
    fwrite(STDERR, "CurlTransport must not ship in the WordPress package\n");
    exit(1);
}

if (!class_exists(WordPressTransport::class)) {
    fwrite(STDERR, "WordPressTransport missing from packaged autoload\n");
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

$fake = new class implements Transport {
    public function request(string $method, string $url, array $headers, ?string $body, float $timeoutSec): array
    {
        return [
            'status' => 200,
            'body' => json_encode(['products' => []], JSON_THROW_ON_ERROR),
            'error' => null,
        ];
    }
};

$test = new AutlanticBilling('abk_test_local', transport: $fake);
$live = new AutlanticBilling('abk_live_example', transport: $fake);
if ($test->mode !== 'test' || $live->mode !== 'live') {
    fwrite(STDERR, "API key mode detection failed\n");
    exit(1);
}

$listed = $test->listProducts();
if (!is_array($listed['products'] ?? null)) {
    fwrite(STDERR, "Transport injection failed\n");
    exit(1);
}

// Stub WordPress HTTP API and confirm WordPressTransport works.
$GLOBALS['autlantic_smoke_wp_calls'] = 0;
if (!function_exists('wp_remote_request')) {
    function wp_remote_request(string $url, array $args = [])
    {
        $GLOBALS['autlantic_smoke_wp_calls']++;
        return [
            'response' => ['code' => 200, 'message' => 'OK'],
            'body' => json_encode(['ok' => true], JSON_THROW_ON_ERROR),
        ];
    }
}
if (!function_exists('is_wp_error')) {
    function is_wp_error($thing): bool
    {
        return false;
    }
}
if (!function_exists('wp_remote_retrieve_response_code')) {
    function wp_remote_retrieve_response_code($response): int
    {
        return (int) ($response['response']['code'] ?? 0);
    }
}
if (!function_exists('wp_remote_retrieve_body')) {
    function wp_remote_retrieve_body($response): string
    {
        return (string) ($response['body'] ?? '');
    }
}

$wpClient = new AutlanticBilling('abk_test_wp', transport: new WordPressTransport());
$wpClient->listProducts();
if (($GLOBALS['autlantic_smoke_wp_calls'] ?? 0) < 1) {
    fwrite(STDERR, "WordPressTransport did not call wp_remote_request\n");
    exit(1);
}

echo "smoke ok\n";
