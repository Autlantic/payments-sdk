# Customer portal

Give subscribers a **hosted self-serve link** to view plan status, cancel at period end, or resume a scheduled cancel. Merchants create a short-lived session with a secret API key; customers open the URL (no API key).

- Hosted UI at `/customer-portal?token=…`
- Session APIs authenticate with the opaque token (header, query, or body)
- Cancel is **at period end** only (same engine path as `POST /v1/subscriptions/:id/cancel` without `immediate`)
- Resume clears a period-end cancel (same as `POST /v1/subscriptions/:id/resume`)

## Create a session (merchant)

```bash
curl -X POST "$AUTLANTIC_BILLING_API_URL/v1/customer_portal_sessions" \
  -H "x-autlantic-api-key: $AUTLANTIC_BILLING_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "subscriptionId": "sub_…" }'
```

Example response:

```json
{
  "id": "clx…",
  "url": "https://billing.autlantic.com/customer-portal?token=…",
  "expiresAt": "2026-09-08T18:00:00.000Z"
}
```

Share `url` with the customer (email, in-app, etc.). Tokens expire after about one hour. Only the SHA-256 hash is stored.

Set `BILLING_CUSTOMER_PORTAL_BASE_URL` on billing-api if the public checkout origin differs from the request host (falls back to `BILLING_CHECKOUT_ORIGIN`, then `BILLING_PORTAL_PUBLIC_URL`, then the request origin).

## Customer session APIs

Pass the raw token as `x-customer-portal-token`, `Authorization: Bearer …`, `?token=`, or JSON `{ "token": "…" }`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/customer-portal/session` | Status, amounts, period end, available actions |
| `POST` | `/customer-portal/session/cancel` | Schedule cancel at period end |
| `POST` | `/customer-portal/session/resume` | Undo period-end cancel |

```bash
TOKEN="…"

curl "$AUTLANTIC_BILLING_API_URL/customer-portal/session?token=$TOKEN"

curl -X POST "$AUTLANTIC_BILLING_API_URL/customer-portal/session/cancel" \
  -H "Content-Type: application/json" \
  -H "x-customer-portal-token: $TOKEN" \
  -d '{}'

curl -X POST "$AUTLANTIC_BILLING_API_URL/customer-portal/session/resume" \
  -H "Content-Type: application/json" \
  -H "x-customer-portal-token: $TOKEN" \
  -d '{}'
```

## Webhooks

Cancel / resume emit the same subscription lifecycle events as the merchant API. Deliver to portal-registered endpoints. See [Webhooks](/guide/webhooks) and [Lifecycle](/guide/lifecycle).

## Notes

- Mode follows the API key (`abk_test_*` / `abk_live_*`). A test session cannot act on a live subscription.
- Immediate cancel and refunds stay on the merchant API / portal dashboard.
- There is no SDK helper yet; use HTTP as above.
