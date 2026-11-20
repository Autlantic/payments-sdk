# Go SDK

Official Autlantic Billing **server client** for Go.
Part of the [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk) · [Languages](/guide/languages).

**USDC on Base** · secrets server-only.

```bash
go get github.com/Autlantic/payments-sdk/sdks/go@v0.1.1
```

Source: [`sdks/go`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/go) · tag `sdks/go/v0.1.1` (consume as `@v0.1.1`)

## Quick start

```go
import billing "github.com/Autlantic/payments-sdk/sdks/go"

client, err := billing.NewFromEnv() // AUTLANTIC_BILLING_API_KEY
if err != nil {
  // handle
}

link, err := client.CreatePaymentLink(map[string]any{
  "amountUsdc": 42,
  "merchantRefPrefix": "invoice",
  "successUrl": "myapp://billing/success",
  "cancelUrl": "myapp://billing/cancel",
})
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
| `ListInvoices(subscriptionID)` | List invoices |
| `GetInvoice(id)` | Fetch invoice |
| `RefundInvoice(id, body)` | Invoice refund |
| `RefundPayment(id, body)` | One-time refund (`payment.refunded`) |
| `VoidInvoice(id)` | Void invoice |
| `ProvisionConnectedMerchant(body)` | Platform Connect provision |
| `ListConnectedMerchants(limit, startingAfter)` | List connected merchants |
| `GetConnectedMerchant(id)` | Fetch connected merchant |
| `UpdateConnectedMerchant(id, body)` | Update connected merchant |
| `DisableConnectedMerchant(id, body)` | Disable connected merchant |
| `CreateConnectedApiKey(id, body)` | Issue connected API key |
| `ListConnectedWebhookEndpoints(id)` | List connected webhook endpoints |
| `CreateConnectedWebhookEndpoint(id, body)` | Create connected webhook endpoint |

Refund + Connect methods require **v0.1.1+**.

## Webhooks

```go
ok := billing.VerifyWebhook(secret, rawBody, signatureHeader)
event, err := billing.ParseWebhookEvent(rawBody)
```

Also: `VerifyWebhookDetailed`, `SignWebhookBody` (tests). Header: `x-autlantic-signature`. See [Webhooks](/guide/webhooks).

## Errors

`*billing.Error` has `Message`, `Code`, `StatusCode`, `RequestID`, `Body`.

Sample merchant backend: [`examples/mobile-checkout/go`](https://github.com/Autlantic/payments-sdk/tree/main/examples/mobile-checkout/go) (port 3057).

## Related

- [Languages and SDKs](/guide/languages)
- [Mobile apps](/guide/mobile)
- [Security](/guide/security)
- [Python SDK](/api/python)
- [Node.js SDK](/api/nodejs)
- [API versioning](/guide/api-versioning)
