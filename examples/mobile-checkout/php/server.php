<?php

declare(strict_types=1);

/**
 * Hosted-mode merchant backend sample for Autlantic mobile Checkout (PHP SDK).
 *
 *   composer install
 *   export AUTLANTIC_BILLING_API_KEY=abk_test_…
 *   php -S 0.0.0.0:3058 server.php
 *
 * Access state is stored in a temp file so it survives php -S request reloads.
 */

require __DIR__ . '/vendor/autoload.php';

use Autlantic\Billing\AutlanticBilling;
use Autlantic\Billing\Webhook;

$scheme = rtrim(getenv('MOBILE_RETURN_SCHEME') ?: 'myapp', ':/');
$successUrl = getenv('MOBILE_SUCCESS_URL') ?: ($scheme . '://billing/success');
$cancelUrl = getenv('MOBILE_CANCEL_URL') ?: ($scheme . '://billing/cancel');
$payout = trim((string) (getenv('AUTLANTIC_PAYOUT_ADDRESS_EVM') ?: '0x1111111111111111111111111111111111111111'));
$webhookSecret = trim((string) (getenv('AUTLANTIC_BILLING_WEBHOOK_SECRET') ?: 'whsec_mobile_example'));
$storePath = getenv('AUTLANTIC_PHP_SAMPLE_STORE') ?: (sys_get_temp_dir() . '/autlantic-php-mobile-access.json');

/** @return array<string, array{active: bool, updatedAt: string, kind: string}> */
function loadAccess(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $decoded = json_decode((string) file_get_contents($path), true);

    return is_array($decoded) ? $decoded : [];
}

/** @param array<string, array{active: bool, updatedAt: string, kind: string}> $rows */
function saveAccess(string $path, array $rows): void
{
    file_put_contents($path, json_encode($rows, JSON_PRETTY_PRINT));
}

function jsonResponse(int $status, mixed $body): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($body);
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET' && $path === '/health') {
    jsonResponse(200, [
        'ok' => true,
        'mode' => 'hosted',
        'sdk' => 'php',
        'successUrl' => $successUrl,
        'cancelUrl' => $cancelUrl,
    ]);
    return;
}

if ($method === 'POST' && $path === '/api/checkout') {
    if (!getenv('AUTLANTIC_BILLING_API_KEY')) {
        jsonResponse(500, ['error' => 'Set AUTLANTIC_BILLING_API_KEY']);
        return;
    }
    $raw = file_get_contents('php://input') ?: '{}';
    $body = json_decode($raw, true) ?: [];
    $amount = (float) ($body['amountUsdc'] ?? 20);
    $merchantRef = trim((string) ($body['merchantRef'] ?? '')) ?: ('mobile_' . (int) (microtime(true) * 1000));
    $access = loadAccess($storePath);
    $access[$merchantRef] = [
        'active' => false,
        'updatedAt' => gmdate('c'),
        'kind' => 'payment_link',
    ];
    saveAccess($storePath, $access);
    try {
        $created = AutlanticBilling::fromEnv()->createPaymentLink([
            'merchantRefPrefix' => $merchantRef,
            'payoutAddressEvm' => $payout,
            'amountUsdc' => $amount,
            'description' => 'Mobile checkout demo (PHP)',
            'maxUses' => 1,
            'successUrl' => $successUrl,
            'cancelUrl' => $cancelUrl,
        ]);
    } catch (Throwable $e) {
        jsonResponse(502, ['error' => $e->getMessage()]);
        return;
    }
    jsonResponse(201, [
        'kind' => 'payment_link',
        'merchantRef' => $merchantRef,
        'checkoutUrl' => $created['url'] ?? null,
        'paymentLinkId' => $created['paymentLink']['id'] ?? null,
        'successUrl' => $successUrl,
        'cancelUrl' => $cancelUrl,
    ]);
    return;
}

if ($method === 'GET' && str_starts_with($path, '/api/access/')) {
    $merchantRef = rawurldecode(substr($path, strlen('/api/access/')));
    $access = loadAccess($storePath);
    if (!isset($access[$merchantRef])) {
        jsonResponse(404, ['error' => 'Unknown merchantRef']);
        return;
    }
    jsonResponse(200, ['merchantRef' => $merchantRef] + $access[$merchantRef]);
    return;
}

if ($method === 'POST' && $path === '/webhooks/autlantic') {
    $raw = file_get_contents('php://input') ?: '';
    $sig = $_SERVER['HTTP_X_AUTLANTIC_SIGNATURE'] ?? null;
    if (!Webhook::verify($webhookSecret, $raw, $sig)) {
        jsonResponse(400, ['error' => 'bad signature']);
        return;
    }
    $event = Webhook::parseEvent($raw);
    if ($event === null) {
        jsonResponse(400, ['error' => 'bad body']);
        return;
    }
    $data = is_array($event['data'] ?? null) ? $event['data'] : [];
    $merchantRef = $data['merchantRef'] ?? $data['merchant_ref'] ?? null;
    $type = $event['type'] ?? null;
    if (
        is_string($merchantRef)
        && $merchantRef !== ''
        && in_array($type, ['invoice.paid', 'payment.paid', 'subscription.activated'], true)
    ) {
        $access = loadAccess($storePath);
        $access[$merchantRef] = [
            'active' => true,
            'updatedAt' => gmdate('c'),
            'kind' => (string) $type,
        ];
        saveAccess($storePath, $access);
    }
    jsonResponse(200, ['received' => true, 'type' => $type]);
    return;
}

jsonResponse(404, ['error' => 'Not found']);
