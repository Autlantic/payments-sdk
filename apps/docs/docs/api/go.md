# Go SDK

Official **server** client for the hosted Billing API. Lives in the payments-sdk repo at `sdks/go`.

```bash
go get github.com/Autlantic/payments-sdk/sdks/go@latest
```

```go
import billing "github.com/Autlantic/payments-sdk/sdks/go"

client, err := billing.NewFromEnv()
link, err := client.CreatePaymentLink(map[string]any{
  "amountUsdc": 42,
  "merchantRefPrefix": "invoice",
  "successUrl": "myapp://billing/success",
})
```

Pins `Autlantic-Version: 2026-01-01`. Hosted mode only. See [Languages](/guide/languages) and [API versioning](/guide/api-versioning).

## Related

- [Python SDK](/api/python)
- [Node.js SDK](/api/nodejs)
- [Mobile apps](/guide/mobile)
