# PHP SDK

Official Autlantic Billing **server client** for PHP.
Part of the [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk) · [Languages](/guide/languages).

**USDC on Base** · secrets server-only.

```bash
composer require autlantic/billing
```

Mirror repo (Packagist-ready root): [`Autlantic/billing-php`](https://github.com/Autlantic/billing-php) tag `v0.1.0`. Source of truth remains `sdks/php` in payments-sdk.

Until Packagist indexes the package:

```bash
composer config repositories.autlantic vcs https://github.com/Autlantic/billing-php.git
composer require autlantic/billing:^0.1
```

Or a path repo to `payments-sdk/sdks/php`.

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

- [Languages and SDKs](/guide/languages)
- [Mobile apps](/guide/mobile)
- [Security](/guide/security)
- [Python SDK](/api/python)
- [Go SDK](/api/go)
- [Node.js SDK](/api/nodejs)
- [API versioning](/guide/api-versioning)
