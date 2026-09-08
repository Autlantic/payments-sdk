# Security

## Secrets

Store in environment variables, never in source:

- `AUTLANTIC_BILLING_API_KEY` (`abk_test_…` in staging, `abk_live_…` in production)
- `AUTLANTIC_BILLING_WEBHOOK_SECRET` (signing secret from the matching Test or Live webhook endpoint)
- Relayer / RPC keys for live charging (platform / worker only)

Rotate API keys and webhook endpoint secrets if leaked.

## Test vs Live

- Never ship a live key (`abk_live_…`) outside production.
- Never put both test and live keys in one production process.
- Mode for hosted checkout follows the key that created the session, not a runtime toggle in your app.

## Mobile apps

Never put API keys or webhook secrets in an iOS/Android binary. Create checkout sessions on your server and open the returned `checkoutUrl` in the app. See [Mobile apps](/guide/mobile).

## Webhooks

Always verify `x-autlantic-signature` before trusting the body. Use the raw request bytes and the endpoint secret for that environment.

## On-chain

- Test keys use **Base Sepolia**. Live keys use **Base mainnet**.
- USDC settles to the merchant `payoutAddressEvm`.
- Autlantic does not custody member subscription revenue.
- Relayers sponsor network fees and submit billing transactions. They do not custody member or merchant subscription balances.

## Sandbox env

`AUTLANTIC_BILLING_SANDBOX` is for in-process demos or rare overrides. Do **not** use it as your production Test/Live switch. Prefer the correct API key.

## Checklist

- [ ] Production uses `abk_live_…` only
- [ ] Staging uses `abk_test_…` only
- [ ] Webhook secret matches the endpoint for that mode
- [ ] Webhook signature verification enabled
- [ ] Merchant payout address configured
- [ ] `AUTLANTIC_BILLING_SANDBOX` unset in production

## Product policy pages

- [Non-custodial overview](https://autlantic.com/non-custodial)
- [Security](https://autlantic.com/security)
