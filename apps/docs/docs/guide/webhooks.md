# Webhooks

Billing events are POSTed to your endpoint with HMAC header `x-autlantic-signature`.

Signing uses the **webhook endpoint secret** from the merchant portal (Test and Live each have their own endpoints and secrets). Put that value in `AUTLANTIC_BILLING_WEBHOOK_SECRET` for the matching deploy.

## Verify

```ts
import {
  verifyBillingWebhook,
  verifyBillingWebhookDetailed,
  parseBillingWebhookEvent,
  parseBillingWebhookEventDetailed,
  assertBillingWebhook,
} from "@autlantic/payments-recurring";

// Argument order: (secret, rawBody, signatureHeader)
const ok = verifyBillingWebhook(
  process.env.AUTLANTIC_BILLING_WEBHOOK_SECRET!,
  rawBody,
  signatureHeader,
);
if (!ok) throw new Error("bad signature");

const event = parseBillingWebhookEvent(rawBody);
```

Prefer detailed helpers when you need ops-friendly failure reasons:

```ts
const verified = verifyBillingWebhookDetailed(secret, rawBody, signatureHeader);
if (!verified.ok) {
  // missing_header | empty_secret | length_mismatch | invalid_signature | compare_error
  console.warn(verified.reason);
}

const parsed = parseBillingWebhookEventDetailed(rawBody);
if (!parsed.ok) {
  // invalid_json | missing_fields
  console.warn(parsed.reason);
}

// Or throw AutlanticBillingError with code webhook_* :
assertBillingWebhook(secret, rawBody, signatureHeader);
```

Always verify against the **raw** request body. Do not re-serialize JSON before checking the signature.

See [Debugging](/guide/debugging) for logger setup and portal delivery retries.

## Test vs Live

| Deploy | Portal | Secret source |
|--------|--------|---------------|
| Staging | Test mode → Webhooks | That Test endpoint’s signing secret |
| Production | Live mode → Webhooks | That Live endpoint’s signing secret |

Test events are delivered only to Test endpoints. Live events only to Live endpoints.

## Common events

- `subscription.created` / `subscription.activated` / `subscription.canceled`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.refunded`
- `invoice.voided`
- `payment.created` / `payment.paid` (one-time payments and payment links)

## Delivery in the portal

Under **Webhooks**, each endpoint shows recent deliveries. Failed attempts are highlighted; use **Retry now** to redeliver. The billing worker also runs **durable automatic retries** for failed deliveries (backoff in the background). Keep Test and Live endpoints separate so secrets match the API key in that deploy.

## API key rotation and audit

In the merchant portal:

- **API keys → Rotate** issues a new secret and retires the old key. Update `AUTLANTIC_BILLING_API_KEY` in your deploy, then revoke or wait out any overlap you need.
- **Audit** lists recent portal actions (key create/rotate/revoke, webhook endpoint changes, manual delivery retries) so operators can see who changed what.

Webhook signing secrets are per endpoint; rotating an API key does not change webhook secrets. Rotate endpoint secrets from the Webhooks page when needed, then update `AUTLANTIC_BILLING_WEBHOOK_SECRET`.

## Env

| Variable | Purpose |
|----------|---------|
| `AUTLANTIC_BILLING_WEBHOOK_SECRET` | Endpoint signing secret for this environment |

Register your app URL under **portal → Webhooks**. Billing delivers only via those merchant endpoints.
