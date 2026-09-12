# Coupons

Discount codes for hosted checkout. Billing stores every coupon (`BillingCoupon`). Portal Coupons and Autlantic creator Coupons write the same API.

## Create and list (merchant API)

Authenticate with your Test or Live API key. Percent off **or** fixed USDC off (not both).

```bash
curl -X POST "$AUTLANTIC_BILLING_API_URL/v1/coupons" \
  -H "x-autlantic-api-key: $AUTLANTIC_BILLING_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: coupon_welcome_1" \
  -d '{
    "code": "WELCOME10",
    "percentOff": 10,
    "duration": "once",
    "maxRedemptions": 100
  }'
```

```bash
curl "$AUTLANTIC_BILLING_API_URL/v1/coupons?includeInactive=1" \
  -H "x-autlantic-api-key: $AUTLANTIC_BILLING_API_KEY"
```

| Field | Notes |
|-------|--------|
| `code` | Case-insensitive at redeem time |
| `percentOff` | Integer percent, or use `amountOffUsdc` |
| `duration` | `once` (default) or `forever` |
| `scopeKey` | Empty / omit = merchant-wide. Set to a stable id (e.g. creator id) for scoped codes |
| `metadata` | Optional string map. Platform creator coupons use `source`, `creatorId`, `planId`, `oncePerMember` |
| `expiresAt` | ISO timestamp or null |
| `maxRedemptions` | Global cap across all customers |

Update with `PATCH /v1/coupons/:id`. Delete with `DELETE /v1/coupons/:id`.

## Node SDK

Requires `@autlantic/payments-recurring` **0.3.13+** (publish pending; until then call HTTP as above).

```ts
import { AutlanticBilling } from "@autlantic/payments-recurring";

const billing = AutlanticBilling.fromEnv();

const { coupon } = await billing.createCoupon({
  code: "WELCOME10",
  percentOff: 10,
  duration: "once",
});

const { coupons } = await billing.listCoupons({ includeInactive: true });
await billing.updateCoupon(coupon.id, { active: false });
```

Exported types: `BillingCoupon`, `CreateBillingCouponRequest`, `UpdateBillingCouponRequest`.

## Checkout apply

Customers enter a code on hosted subscribe or pay checkout:

| Method | Path |
|--------|------|
| `POST` / `DELETE` | `/checkout/subscribe/:id/coupon` |
| `POST` / `DELETE` | `/checkout/pay/:id/coupon` |

Body: `{ "code": "WELCOME10" }`. Resolution prefers a matching `scopeKey` (from session metadata such as `creatorId`), then merchant-wide (`scopeKey=""`).

## Portal

Merchants manage codes under **Coupons** in the billing portal (`scopeKey` empty). No separate coupon store elsewhere.

## Related

- [Hosted HTTP API](/api/http)
- [OpenAPI](/api/openapi) (`BillingCoupon` schema)
- [One-time payments](/guide/one-time-payments) (pay checkout coupon routes)
