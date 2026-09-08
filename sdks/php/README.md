# Autlantic Billing (PHP)

Official **server** client for the hosted Autlantic Billing API.

```bash
composer require autlantic/billing
# (Packagist after package submit; until then use a Composer path repo → sdks/php)
```

Until Packagist is linked, install from a path repo (see [PHP docs](https://docs.autlantic.com/api/php)):

```bash
composer config repositories.autlantic path ./sdks/php
composer require autlantic/billing:@dev
```

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
