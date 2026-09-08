# Go SDK

Official **server** client for the hosted Billing API.

```bash
go get github.com/Autlantic/payments-sdk/sdks/go@sdks/go/v0.1.0
```

Source: [`sdks/go`](https://github.com/Autlantic/payments-sdk/tree/main/sdks/go) · tag `sdks/go/v0.1.0`

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

## Webhooks

```go
ok := billing.VerifyWebhook(secret, rawBody, signatureHeader)
event, err := billing.ParseWebhookEvent(rawBody)
```

Also: `VerifyWebhookDetailed`, `SignWebhookBody` (tests). Header: `x-autlantic-signature`. See [Webhooks](/guide/webhooks).

## Errors

`*billing.Error` has `Message`, `Code`, `StatusCode`, `RequestID`, `Body`.

## Related

- [Python SDK](/api/python)
- [Node.js SDK](/api/nodejs)
- [Mobile apps](/guide/mobile)
- [API versioning](/guide/api-versioning)
- [Languages and SDKs](/guide/languages)
