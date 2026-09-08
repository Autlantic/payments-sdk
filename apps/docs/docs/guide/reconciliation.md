# Reconciliation exports

Download merchant CSV snapshots from the billing portal for accounting and ops reconciliation.

## Portal

1. Open **Exports** in the merchant portal (`/dashboard/exports`).
2. Set the **Test / Live** mode toggle (same as the rest of the dashboard).
3. Choose a date range (`from` / `to`, max **366 days**).
4. Download one of:

| Export | Contents |
|--------|----------|
| Invoices | Subscription renewals and one-time charges |
| Subscriptions | Recurring plans created in the range |
| Payments | One-time / payment-link charges |
| Webhook deliveries | Delivery attempts for endpoints in that mode |

Files are UTF-8 CSV attachments filtered by `createdAt` in the selected window.

## API (session)

Authenticated portal routes (same session cookie as the dashboard):

```http
GET /api/merchant/exports/invoices?mode=test&from=2025-01-01&to=2025-01-31
GET /api/merchant/exports/subscriptions?mode=test&from=2025-01-01&to=2025-01-31
GET /api/merchant/exports/payments?mode=test&from=2025-01-01&to=2025-01-31
GET /api/merchant/exports/webhook-deliveries?mode=test&from=2025-01-01&to=2025-01-31
```

- `mode`: `test` or `live` (falls back to the portal mode header if omitted)
- `from` / `to`: `YYYY-MM-DD` or ISO timestamps
- Response: `text/csv` with `Content-Disposition: attachment`

These routes are for merchant operators in the portal, not public API keys. For programmatic access to live objects, use the hosted Billing API and webhooks instead.

See [Sandbox & testing](/guide/sandbox) for Test vs Live, and [Webhooks](/guide/webhooks) for delivery semantics.
