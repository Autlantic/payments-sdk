# .NET SDK

Official Autlantic Billing **server client** for .NET.
Part of the [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk) · [Languages](/guide/languages).

**USDC on Base** · secrets server-only.

Source: [`sdks/dotnet`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/dotnet). Package: [`Autlantic.Billing`](https://www.nuget.org/packages/Autlantic.Billing) **0.1.0** on NuGet.

## Install

```bash
dotnet add package Autlantic.Billing --version 0.1.0
```

Requires **.NET 8+**.

## Quick start

```csharp
using Autlantic.Billing;
using System.Text.Json.Nodes;

var billing = AutlanticBilling.FromEnv(); // AUTLANTIC_BILLING_API_KEY

JsonObject link = billing.CreatePaymentLink(new Dictionary<string, object?>
{
  ["amountUsdc"] = 42,
  ["merchantRefPrefix"] = "invoice",
  ["successUrl"] = "myapp://billing/success",
  ["cancelUrl"] = "myapp://billing/cancel",
});
// Share link["url"] or open it with the mobile Checkout SDK
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
| `ListProducts()` | Catalog |
| `CreateSubscription(body)` | Incomplete subscription + checkout URL |
| `GetSubscription(id)` | Fetch |
| `ActivateSubscription(id)` | Activate |
| `CancelSubscription(id, body)` | Cancel |
| `CreatePayment(body)` | One-time payment |
| `GetPayment(id)` | Fetch |
| `CreatePaymentLink(body)` | Shareable link |
| `ListPaymentLinks()` | List |
| `GetPaymentLink(id)` | Fetch |
| `DisablePaymentLink(id)` | Disable |
| `ListInvoices(subscriptionId)` | List invoices |

Async variants (`*Async`) are available for all methods.

## Webhooks

```csharp
bool ok = Webhook.Verify(secret, rawBody, signatureHeader);
JsonObject? evt = Webhook.ParseEvent(rawBody);
```

Also: `Webhook.VerifyDetailed`, `Webhook.SignBody` (tests). Header: `x-autlantic-signature`. See [Webhooks](/guide/webhooks).

## Errors

`AutlanticBillingException` exposes Code, StatusCode, RequestId, and Body.

Sample merchant backend: [`examples/mobile-checkout/dotnet`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout/dotnet) (port 3060).

## Related

- [Languages and SDKs](/guide/languages)
- [Mobile apps](/guide/mobile)
- [Security](/guide/security)
- [Java SDK](/api/java)
- [PHP SDK](/api/php)
- [Python SDK](/api/python)
- [Go SDK](/api/go)
- [Node.js SDK](/api/nodejs)
- [API versioning](/guide/api-versioning)
