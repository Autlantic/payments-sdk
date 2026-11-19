# Platform connected merchants

Hosts (CubeWP, multi-store Woo, SaaS builders) can provision **one Autlantic merchant per store** with its own API keys, webhook endpoints, and payout wallet. Settlements never mix across stores.

## Enable

Ops grants Connect capability on the parent merchant:

`PATCH /api/ops/merchants/:merchantId/platform` with `{ "isPlatform": true }` (billing-portal ops secret + IP allowlist).

Portal: **Platform** lists and provisions stores once `isPlatform` is true.

KYC / payout identity for connected sellers remains **blocked (external)** until Autlantic’s compliance path ships. Ops enablement is the supported gate today.

## HTTP API

Use the **platform** merchant API key (`abk_test_…` / `abk_live_…`). Child merchant keys cannot call `/v1/platform/*` (403). Disabled connected merchants cannot authenticate.

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/v1/platform/connected-merchants` | Idempotent on `externalStoreRef`; optional webhook + API key (secrets once) |
| `GET` | `/v1/platform/connected-merchants` | List (`limit`, `startingAfter`) |
| `GET` | `/v1/platform/connected-merchants/:id` | Fetch |
| `PATCH` | `/v1/platform/connected-merchants/:id` | Update display / payout |
| `POST` | `/v1/platform/connected-merchants/:id/disable` | Disable; revokes keys by default |
| `POST` | `/v1/platform/connected-merchants/:id/api-keys` | Issue key (secret once) |
| `POST` | `/v1/platform/connected-merchants/:id/webhook-endpoints` | Create endpoint (secret once) |
| `GET` | `/v1/platform/connected-merchants/:id/webhook-endpoints` | List (secrets never re-listed) |

OpenAPI: [Hosted HTTP API](/api/http) · raw [`/openapi.yaml`](https://docs.autlantic.com/openapi.yaml).

## Node SDK

```ts
import { AutlanticBilling } from "@autlantic/payments-recurring";

const platform = new AutlanticBilling({
  apiBaseUrl: "https://billing.autlantic.com",
  apiKey: process.env.AUTLANTIC_BILLING_API_KEY!,
  merchantId: process.env.AUTLANTIC_BILLING_MERCHANT_ID!,
});

const { merchant, apiKey, webhookEndpoint, reused } =
  await platform.provisionConnectedMerchant({
    displayName: "Summit Desk Store A",
    externalStoreRef: "host_site_store_a",
    payoutAddressEvm: "0x…",
    webhookUrl: "https://store-a.example/webhooks/autlantic",
  });

// Persist apiKey.secretKey + webhookEndpoint.secret on the store once.
const page = await platform.listConnectedMerchants({ limit: 50 });
```

Requires `@autlantic/payments-recurring` **0.3.24+**. Sandbox / in-process mode rejects these methods (hosted only).

## PHP SDK

```php
$platform = AutlanticBilling::fromEnv(); // platform merchant key

$result = $platform->provisionConnectedMerchant([
  'displayName' => 'Summit Desk Store A',
  'externalStoreRef' => 'host_site_store_a',
  'payoutAddressEvm' => '0x…',
  'webhookUrl' => 'https://store-a.example/webhooks/autlantic',
]);

$page = $platform->listConnectedMerchants(['limit' => 50]);
```

Requires `autlantic/billing` **0.1.1+**.

## Woo / host install

1. Platform provisions with `externalStoreRef` = host site id.
2. Write returned `apiKey.secretKey` + webhook secret into that store’s Autlantic gateway settings.
3. Each store settles to its own payout address.
4. WooCommerce plugin **1.1.6+** maps subscription `interval` + `intervalCount` for multi-month / multi-week plans.
