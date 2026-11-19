# Platform connected merchants (Connect-style)

Hosts (for example CubeWP) can provision one Autlantic merchant per store with its own API keys, webhook endpoints, and payout wallet.

## Enable

Ops grants Connect capability:

`PATCH /api/ops/merchants/:merchantId/platform` with `{ "isPlatform": true }` (billing-portal ops secret + IP allowlist).

Portal: **Platform** nav item lists and provisions stores once `isPlatform` is true.

## HTTP API (platform merchant API key)

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/v1/platform/connected-merchants` | Idempotent on `externalStoreRef`; optional webhook + API key (secrets once) |
| `GET` | `/v1/platform/connected-merchants` | List |
| `GET` | `/v1/platform/connected-merchants/:id` | Fetch |
| `PATCH` | `/v1/platform/connected-merchants/:id` | Update display/payout |
| `POST` | `/v1/platform/connected-merchants/:id/disable` | Disable; revokes keys by default |
| `POST` | `/v1/platform/connected-merchants/:id/api-keys` | Issue key (secret once) |
| `POST` | `/v1/platform/connected-merchants/:id/webhook-endpoints` | Create endpoint (secret once) |
| `GET` | `/v1/platform/connected-merchants/:id/webhook-endpoints` | List (secrets never re-listed) |

Child merchant keys cannot call `/v1/platform/*` (403). Disabled connected merchants cannot authenticate.

## SDKs

- Node `@autlantic/payments-recurring` **0.3.23+**: `provisionConnectedMerchant`, `listConnectedMerchants`, `getConnectedMerchant`, `updateConnectedMerchant`, `disableConnectedMerchant`, `createConnectedApiKey`, `listConnectedWebhookEndpoints`, `createConnectedWebhookEndpoint`
- PHP `autlantic/billing` **0.1.1+**: same method names
- Guide: https://docs.autlantic.com/guide/platform-connected-merchants

## Woo / host install

1. Platform provisions with `externalStoreRef` = host site id.
2. Write returned `apiKey.secretKey` + webhook secret into that store’s Autlantic gateway settings.
3. Each store settles to its own payout address.
