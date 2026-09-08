# Java SDK

Official **server** client for the hosted Billing API.

Source: [`sdks/java`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/java). Tag `sdks/java/v0.1.0` when publishing. Maven Central (`com.autlantic:billing`) shares the Android namespace gate — use a composite/path dependency until then.

```kotlin
// settings.gradle.kts
includeBuild("/path/to/payments-sdk/sdks/java")

// build.gradle.kts
dependencies {
  implementation("com.autlantic:billing")
}
```

## Quick start

```java
import com.autlantic.billing.AutlanticBilling;
import com.autlantic.billing.Webhook;
import java.util.Map;

AutlanticBilling billing = AutlanticBilling.fromEnv(); // AUTLANTIC_BILLING_API_KEY

Map<String, Object> link = billing.createPaymentLink(Map.of(
  "amountUsdc", 42,
  "merchantRefPrefix", "invoice",
  "successUrl", "myapp://billing/success",
  "cancelUrl", "myapp://billing/cancel"
));
// Share link.get("url") or open it with the mobile Checkout SDK
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
| `createSubscription(body)` | Incomplete subscription + checkout URL |
| `getSubscription(id)` | Fetch |
| `activateSubscription(id)` | Activate |
| `cancelSubscription(id, body)` | Cancel |
| `createPayment(body)` | One-time payment |
| `getPayment(id)` | Fetch |
| `createPaymentLink(body)` | Shareable link |
| `listPaymentLinks()` | List |
| `getPaymentLink(id)` | Fetch |
| `disablePaymentLink(id)` | Disable |
| `listInvoices(subscriptionId)` | List invoices |

## Webhooks

```java
boolean ok = Webhook.verify(secret, rawBody, signatureHeader);
Map<String, Object> event = Webhook.parseEvent(rawBody);
```

Also: `Webhook.verifyDetailed`, `Webhook.signBody` (tests). Header: `x-autlantic-signature`. See [Webhooks](/guide/webhooks).

## Errors

`AutlanticBillingException` exposes code, statusCode, requestId, and body.

Sample merchant backend: [`examples/mobile-checkout/java`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout/java) (port 3059).

## Related

- [PHP SDK](/api/php)
- [.NET SDK](/api/dotnet)
- [Python SDK](/api/python)
- [Go SDK](/api/go)
- [Node.js SDK](/api/nodejs)
- [Mobile apps](/guide/mobile)
- [API versioning](/guide/api-versioning)
- [Languages and SDKs](/guide/languages)
