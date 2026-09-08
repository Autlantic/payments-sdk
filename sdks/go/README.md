<p align="center">
  <img src="https://autlantic.com/brand/autlantic-icon-1024-master.png" alt="Autlantic" width="96" height="96" />
</p>

<h1 align="center">Autlantic Billing — Go</h1>

<p align="center">
  <strong>USDC payments on Base</strong><br />
  Official server client for the hosted Autlantic Billing API.
</p>

<p align="center">
  <a href="https://docs.autlantic.com/api/go"><img src="https://img.shields.io/badge/docs-docs.autlantic.com-5672cd?style=flat-square" alt="Docs" /></a>
  <a href="https://github.com/Autlantic/payments-sdk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://autlantic.com"><img src="https://img.shields.io/badge/product-autlantic.com-111827?style=flat-square" alt="Autlantic" /></a>
</p>

---

## Why this SDK

Same Billing API as Node — create subscriptions, one-time payments, and shareable payment links; verify webhooks. Non-custodial USDC on Base settles to your merchant `payoutAddressEvm`. API keys and webhook secrets stay on the server.

## Install

```bash
go get github.com/Autlantic/payments-sdk/sdks/go@sdks/go/v0.1.0
```

Module path: `github.com/Autlantic/payments-sdk/sdks/go` · tag `sdks/go/v0.1.0`.

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
// Share link["url"] or open it with a mobile Checkout SDK
```

## Webhooks

Verify `x-autlantic-signature` with your portal endpoint secret:

```go
ok := billing.VerifyWebhook(secret, rawBody, signatureHeader)
event, err := billing.ParseWebhookEvent(rawBody)
// Unlock on invoice.paid / payment.paid / subscription.activated
```

Also: `VerifyWebhookDetailed`, `SignWebhookBody` (tests).

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
| [Go SDK](https://docs.autlantic.com/api/go) | API reference |
| [Languages](https://docs.autlantic.com/guide/languages) | All SDK surfaces |
| [Mobile apps](https://docs.autlantic.com/guide/mobile) | Checkout presenters |
| [Webhooks](https://docs.autlantic.com/guide/webhooks) | Signature & events |
| [Terms](https://autlantic.com/terms) · [Privacy](https://autlantic.com/privacy) · [Security](https://autlantic.com/security) | Legal |

## Develop

```bash
go test ./...
```

## License

MIT · Operated by **Autlantic Limited** (UK company no. 17422039).

Part of [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk).
