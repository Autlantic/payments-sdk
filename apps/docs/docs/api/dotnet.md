# .NET SDK

Official **server** client for the hosted Billing API.

Source: [`sdks/dotnet`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/dotnet). Tag `sdks/dotnet/v0.1.0` when publishing. NuGet package id: `Autlantic.Billing`.

Until NuGet is published, use a project reference:

```xml
<ItemGroup>
  <ProjectReference Include="/path/to/payments-sdk/sdks/dotnet/src/Autlantic.Billing/Autlantic.Billing.csproj" />
</ItemGroup>
```

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

- [Java SDK](/api/java)
- [PHP SDK](/api/php)
- [Python SDK](/api/python)
- [Go SDK](/api/go)
- [Node.js SDK](/api/nodejs)
- [Mobile apps](/guide/mobile)
- [API versioning](/guide/api-versioning)
- [Languages and SDKs](/guide/languages)
