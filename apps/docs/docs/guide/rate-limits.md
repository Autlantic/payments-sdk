# Rate limits

The hosted Billing API enforces in-process rate limits to protect shared infrastructure. Limits are per rolling **60-second** window. Exceeding a limit returns **HTTP 429**.

## Current limits

| Scope | Limit | Window | Applies to |
|-------|------:|--------|------------|
| Client IP (API) | **120** requests | 60 seconds | Authenticated `/v1/*` routes |
| API key | **60** requests | 60 seconds | Same routes, additionally when a key is present |
| Client IP (checkout mutate) | **30** requests | 60 seconds | Checkout mutation endpoints (action-token gated) |

API traffic must pass the IP bucket first, then the API-key bucket (when a key is sent). Checkout mutations use a separate IP bucket and do not share the API-key counter.

Limits may be tightened or raised over time. Treat the table above as the documented contract for the current deployment; check the [changelog](/resources/changelog) for announced changes.

## 429 response

When limited, the API responds with status `429` and a JSON body similar to:

```json
{
  "error": "Rate limit exceeded",
  "retryAfterSec": 60
}
```

### Retry-After

The hosted API sets a **`Retry-After`** response header (seconds) on rate-limited responses, matching `retryAfterSec` in the body (typically `60`).

Clients should prefer `Retry-After` when present, and fall back to `retryAfterSec` or a conservative backoff if headers differ by proxy or edge. Limit enforcement is always authoritative; header presentation may vary across intermediaries.

## Client guidance

1. Back off on `429`. Do not hammer the same endpoint.
2. Honor `Retry-After` / `retryAfterSec` before retrying.
3. Use [idempotency](/guide/idempotency) on POST creates so safe retries do not create duplicates.
4. Official SDKs retry on `429` / `5xx` with backoff. Prefer the SDK when possible.

## Related

- [Idempotency](/guide/idempotency)
- [Retries](/guide/retries) (invoice charge schedule, not HTTP rate limits)
- [Debugging](/guide/debugging)
- [Hosted HTTP API](/api/http)
