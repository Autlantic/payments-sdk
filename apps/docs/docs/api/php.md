# PHP SDK

Official **server** client for the hosted Billing API.

```bash
# Local / monorepo (until Packagist package is live)
composer config repositories.autlantic path /path/to/payments-sdk/sdks/php
composer require autlantic/billing:@dev
```

Or path-require from `examples/mobile-checkout/php`. Tag: `sdks/php/v0.1.0`.

## Quick start

```php
use Autlantic\Billing\AutlanticBilling;
use Autlantic\Billing\Webhook;

$billing = AutlanticBilling::fromEnv(); // AUTLANTIC_BILLING_API_KEY

$link = $billing->createPaymentLink([
  'amountUsdc' => 42,
  'merchantRefPrefix' => 'invoice',
  'successUrl' => 'myapp://billing/success',
  'cancelUrl' => 'myapp://billing/cancel',
]);
// Share $link['url'] or open it with the mobile Checkout SDK
```

## Environment

| Env var | Purpose |
|---------|---------|
| `AUTLANTIC_BILLING_API_KEY` | `abk_test_…` or `abk_live_…` (required) |
| `AUTLANTIC_BILLING_API_URL` | Default `https://billing.autlantic.com` |
| `AUTLANTIC_BILLING_MERCHANT_ID` | Optional merchant id |

Hosted mode only. Pins `Autlantic-Version: 2026-01-01`. Idempotent POSTs and retries on 429/5xx.

## Client methods

| Method | Description |
|--------|-------------|
| `listProducts()` | Catalog |
| `createSubscription($body)` | Incomplete subscription + checkout URL |
| `getSubscription($id)` | Fetch |
| `activateSubscription($id)` | Activate |
| `cancelSubscription($id, $body)` | Cancel |
| `createPayment($body)` | One-time payment |
| `getPayment($id)` | Fetch |
| `createPaymentLink($body)` | Shareable link |
| `listPaymentLinks()` | List |
| `getPaymentLink($id)` | Fetch |
| `disablePaymentLink($id)` | Disable |
| `listInvoices($subscriptionId)` | List invoices |

## Webhooks

```php
$ok = Webhook::verify($secret, $rawBody, $signatureHeader);
$event = Webhook::parseEvent($rawBody);
```

Also: `Webhook::verifyDetailed`, `Webhook::signBody` (tests). Header: `x-autlantic-signature`. See [Webhooks](/guide/webhooks).

## Errors

`AutlanticBillingException` exposes `codeName`, `statusCode`, `requestId`, and `body`.

Sample merchant backend: [`examples/mobile-checkout/php`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout/php) (port 3058).

## Related

- [Python SDK](/api/python)
- [Go SDK](/api/go)
- [Node.js SDK](/api/nodejs)
- [Mobile apps](/guide/mobile)
- [API versioning](/guide/api-versioning)
- [Languages and SDKs](/guide/languages)
