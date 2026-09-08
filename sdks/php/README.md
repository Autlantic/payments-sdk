# Autlantic Billing (PHP)

Official **server** client for the hosted Autlantic Billing API.

```bash
composer require autlantic/billing
```

Packagist-friendly mirror: [`Autlantic/billing-php`](https://github.com/Autlantic/billing-php). Until Packagist indexes:

```bash
composer config repositories.autlantic vcs https://github.com/Autlantic/billing-php.git
composer require autlantic/billing:^0.1
```

Or path-require from this monorepo (`sdks/php`).

## Usage

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
$url = $link['url'] ?? null;
```

Webhook handler:

```php
$ok = Webhook::verify($secret, $rawBody, $_SERVER['HTTP_X_AUTLANTIC_SIGNATURE'] ?? null);
$event = Webhook::parseEvent($rawBody);
```

## Notes

- Hosted API only. Pins `Autlantic-Version: 2026-01-01`.
- Secrets stay on the server. Mobile apps use Checkout SDKs, not this package.
- PHP 8.1+, `ext-curl`, `ext-json`, `ext-hash`.

```bash
composer install
composer test
```

Docs: [PHP SDK](https://docs.autlantic.com/api/php) · [Languages](https://docs.autlantic.com/guide/languages)
