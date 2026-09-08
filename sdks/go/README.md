# Autlantic Billing (Go)

Official **server** client for the hosted Autlantic Billing API.

```bash
go get github.com/Autlantic/payments-sdk/sdks/go@latest
```

```go
import billing "github.com/Autlantic/payments-sdk/sdks/go"

client, err := billing.NewFromEnv() // AUTLANTIC_BILLING_API_KEY
if err != nil { /* … */ }

link, err := client.CreatePaymentLink(map[string]any{
  "amountUsdc": 42,
  "merchantRefPrefix": "invoice",
  "successUrl": "myapp://billing/success",
  "cancelUrl": "myapp://billing/cancel",
})
```

- Hosted mode only. Pins `Autlantic-Version: 2026-01-01`.
- Webhook helpers: `VerifyWebhook`, `ParseWebhookEvent`.

Docs: [Languages](https://docs.autlantic.com/guide/languages)
