# Idempotency

Pass an **`Idempotency-Key`** header on POST requests that create or mutate resources so network retries are safe. The hosted API stores the first successful (or terminal) response and replays it for the same key.

## Header

| Header | Required | Notes |
|--------|----------|-------|
| `Idempotency-Key` | Recommended on POSTs | Opaque string you choose (UUID recommended). Scoped per merchant. |

Official server SDKs send `Idempotency-Key` on hosted POST calls automatically.

## Behavior

| Case | Result |
|------|--------|
| First request with a new key | Processed normally; response stored |
| Same key + same request body | Cached response replayed (same status and body). Response may include `X-Idempotent-Replayed: true` |
| Same key + **different** body | **409** with `{ "error": "Idempotency key reused with a different request body" }` |
| Key omitted | Request runs without idempotency protection |

## Retention

Keys and cached responses are retained for **24 hours**. After expiry, the same key may be reused as a new first request.

## Best practices

1. Generate a unique key per logical create (for example one key per checkout attempt or subscription create).
2. Reuse the **same** key only when retrying the **same** operation (identical body).
3. Do not reuse a key for a different payload; that yields `409`.
4. Combine with [rate-limit](/guide/rate-limits) backoff: on `429`, wait, then retry with the same idempotency key.

## Related

- [Rate limits](/guide/rate-limits)
- [API versioning](/guide/api-versioning)
- [Hosted HTTP API](/api/http)
- [OpenAPI](/api/openapi)
