<p align="center">
  <img src="https://autlantic.com/brand/autlantic-icon-1024-master.png" alt="Autlantic" width="96" height="96" />
</p>

<h1 align="center">Autlantic Billing — PHP</h1>

<p align="center">
  <strong>USDC payments on Base</strong><br />
  Official server client for the hosted Autlantic Billing API.
</p>

<p align="center">
  <a href="https://docs.autlantic.com/api/php"><img src="https://img.shields.io/badge/docs-docs.autlantic.com-5672cd?style=flat-square" alt="Docs" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://autlantic.com"><img src="https://img.shields.io/badge/product-autlantic.com-111827?style=flat-square" alt="Autlantic" /></a>
</p>

---

## Why this SDK

Same Billing API as Node — create subscriptions, one-time payments, and shareable payment links; verify webhooks. Non-custodial USDC on Base settles to your merchant `payoutAddressEvm`. API keys and webhook secrets stay on the server.

## Install

```bash
composer require autlantic/billing
```

Packagist-friendly mirror: [`Autlantic/billing-php`](https://github.com/Autlantic/billing-php). Until Packagist indexes:

```bash
composer config repositories.autlantic vcs https://github.com/Autlantic/billing-php.git
composer require autlantic/billing:^0.1
```

For local development from this monorepo, path-require `sdks/php`. Requires **PHP 8.1+**, `ext-curl`, `ext-json`, `ext-hash`.

## Quick start

```php
use Autlantic\Billing\AutlanticBilling;

$billing = AutlanticBilling::fromEnv(); // AUTLANTIC_BILLING_API_KEY

$link = $billing->createPaymentLink([
  'amountUsdc' => 42,
  'merchantRefPrefix' => 'invoice',
  'successUrl' => 'myapp://billing/success',
  'cancelUrl' => 'myapp://billing/cancel',
]);
// Share $link['url'] or open it with a mobile Checkout SDK
```

## Webhooks

Verify `x-autlantic-signature` with your portal endpoint secret:

```php
use Autlantic\Billing\Webhook;

$ok = Webhook::verify($secret, $rawBody, $_SERVER['HTTP_X_AUTLANTIC_SIGNATURE'] ?? null);
$event = Webhook::parseEvent($rawBody);
// Unlock on invoice.paid / payment.paid / subscription.activated
```

## Environment

| Env var | Purpose |
|---------|---------|
| `AUTLANTIC_BILLING_API_KEY` | `abk_test_…` or `abk_live_…` (required) |
| `AUTLANTIC_BILLING_API_URL` | Default `https://billing.autlantic.com` |
| `AUTLANTIC_BILLING_MERCHANT_ID` | Optional merchant id |

Hosted mode only. Pins `Autlantic-Version: 2026-01-01`.

## Documentation

| | |
|--|--|
| [PHP SDK](https://docs.autlantic.com/api/php) | API reference |
| [Languages](https://docs.autlantic.com/guide/languages) | All SDK surfaces |
| [Mobile apps](https://docs.autlantic.com/guide/mobile) | Checkout presenters |
| [Webhooks](https://docs.autlantic.com/guide/webhooks) | Signature & events |
| [Terms](https://autlantic.com/terms) · [Privacy](https://autlantic.com/privacy) · [Security](https://autlantic.com/security) | Legal |

## Develop

```bash
composer install
composer test
```

## License

MIT · Operated by **Autlantic Limited** (UK company no. 17422039).

Part of [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk).
