# Test clock

Advance **test-mode** billing time so renewals and due invoices fire without waiting for the wall clock. Live mode always uses real time.

Requires a **test API key** (`abk_test_…`). Live keys get `403`.

## API

Base URL: `https://billing.autlantic.com` (or your hosted billing-api).

### `GET /v1/test_clock`

Returns the merchant’s clock and the effective “now” used for test due selection.

```bash
curl "$AUTLANTIC_BILLING_API_URL/v1/test_clock" \
  -H "x-autlantic-api-key: $AUTLANTIC_BILLING_API_KEY"
```

Example response:

```json
{
  "object": "test_clock",
  "frozenAt": "2026-10-01T00:00:00.000Z",
  "effectiveNow": "2026-10-01T00:00:00.000Z",
  "createdAt": "2026-09-08T12:00:00.000Z",
  "updatedAt": "2026-09-08T12:05:00.000Z"
}
```

- `frozenAt`: ISO datetime when time is frozen, or `null` for wall clock.
- `effectiveNow`: `frozenAt` when set, otherwise the current wall time.

### `POST /v1/test_clock`

Provide **either** `frozenAt` **or** `advanceBySeconds` (not both).

| Body | Effect |
|------|--------|
| `{ "frozenAt": "2026-10-01T00:00:00.000Z" }` | Freeze at that instant |
| `{ "frozenAt": null }` | Clear freeze (back to wall clock) |
| `{ "advanceBySeconds": 86400 }` | Advance from current freeze (or now) by N seconds |

```bash
# Freeze at a date
curl -X POST "$AUTLANTIC_BILLING_API_URL/v1/test_clock" \
  -H "x-autlantic-api-key: $AUTLANTIC_BILLING_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "frozenAt": "2026-10-01T00:00:00.000Z" }'

# Advance one day
curl -X POST "$AUTLANTIC_BILLING_API_URL/v1/test_clock" \
  -H "x-autlantic-api-key: $AUTLANTIC_BILLING_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "advanceBySeconds": 86400 }'

# Resume wall clock
curl -X POST "$AUTLANTIC_BILLING_API_URL/v1/test_clock" \
  -H "x-autlantic-api-key: $AUTLANTIC_BILLING_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "frozenAt": null }'
```

Rules:

- Clock only moves **forward** when already frozen.
- `advanceBySeconds` must be a positive number.
- Invalid or conflicting bodies return `400`.

## Portal Overview card

In the merchant portal, switch to **Test**. On **Overview**, the **Test clock** card shows effective now (frozen or wall clock) and shortcuts: `+1 hour`, `+1 day`, `+7 days`, `+30 days`, freeze to a datetime, and clear freeze. The card is hidden in Live.

## Worker behavior

`billing-worker` selects open test invoices due by each merchant’s effective now:

- Merchant with `frozenAt` set: use that instant for `dueAt` / `nextAttemptAt` checks.
- Unfrozen test merchants: wall clock.
- Live invoices: always wall clock (never the test clock).

Test due charges run in sandbox. After you advance the clock past a period end or retry window, the next worker cycle can create/charge those invoices and emit the usual webhooks.

## Sandbox failure modes

Briefly (see [Error codes](/guide/errors) and [Retries](/guide/retries)):

- Hosted Test / worker sandbox can still fail invoices with codes such as `INSUFFICIENT_BALANCE`, `ALLOWANCE_EXCEEDED`, or related decline paths; retries follow the default schedule.
- In-process SDK sandbox can force `SANDBOX_DECLINED` when configured for decline tests.
- Advancing the clock does not skip failure handling; it only changes when due attempts are eligible.

## Related

- [Sandbox & testing](/guide/sandbox)
- [Retries](/guide/retries)
- [Lifecycle](/guide/lifecycle)
- [Webhooks](/guide/webhooks)
