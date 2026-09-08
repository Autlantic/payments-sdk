# API versioning

Hosted Billing uses a **pinned API version** (Stripe-style) so official SDKs do not silently break when the HTTP contract evolves.

## Current version

| | |
|--|--|
| **Version** | `2026-01-01` |
| **Request header** | `Autlantic-Version: 2026-01-01` |
| **Response header** | `Autlantic-Version: 2026-01-01` |

If the request omits `Autlantic-Version`, the API uses `2026-01-01` (current default).

Unsupported values return `400` with a stable error body.

## Official SDKs

Server SDKs send `Autlantic-Version` on every hosted request and pin to a version listed in their changelog. Upgrade the SDK (or pass an explicit version when the client supports it) to opt into newer behavior.

## Compatibility policy

- Additive changes (new optional fields, new endpoints) may ship on the current version.
- Breaking changes require a **new dated version** and a deprecation window announced in the [changelog](/resources/changelog).
- OpenAPI at [docs.autlantic.com/openapi.yaml](https://docs.autlantic.com/openapi.yaml) describes the current default version.

## Related headers

| Header | Role |
|--------|------|
| `Autlantic-Version` | API contract pin (request + response) |
| `Idempotency-Key` | Safe retries on POST creates |
| `X-Autlantic-Client-Request-Id` | Client-generated id for support |
| `x-request-id` / `x-autlantic-request-id` | Server request id when present |
| `X-Autlantic-Sdk-Version` | SDK package version (Node and other official clients) |

When contacting support, include `request_id`, merchant id, Test or Live, and `Autlantic-Version`.

## Related

- [Hosted HTTP API](/api/http)
- [OpenAPI](/api/openapi)
- [Debugging](/guide/debugging)
- [Languages and SDKs](/guide/languages)
