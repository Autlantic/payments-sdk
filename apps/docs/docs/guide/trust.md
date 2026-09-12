# Trust center

Autlantic Billing is operated by **Autlantic Limited** (UK). This page summarizes how settlement, security, and data handling work for merchants integrating the hosted API and SDKs.

## Non-custodial USDC on Base

- Live settlement uses **USDC on Base mainnet**. Test keys use **Base Sepolia**.
- Member subscription and payment revenue settle to the merchant `payoutAddressEvm`. Autlantic does not custody that revenue.
- Relayers sponsor network fees and submit billing transactions. They do not hold member or merchant subscription balances.

Product overview: [Non-custodial](https://autlantic.com/non-custodial).

## Security overview

Integrator and operator practices (API keys, Test vs Live, webhook verification, mobile): [Security guide](/guide/security).

Vulnerability disclosure for published packages: email **[support@autlantic.com](mailto:support@autlantic.com)**. Do not open a public GitHub issue for security reports. Full policy: [SECURITY.md](https://github.com/Autlantic/payments-sdk/blob/main/SECURITY.md) in the public SDK repository.

Product security page: [autlantic.com/security](https://autlantic.com/security) (company Security FAQ). Short product pages: [portal.autlantic.com/security](https://portal.autlantic.com/security), [platform.autlantic.com/security](https://platform.autlantic.com/security).

This page does **not** claim SOC 2 or other formal compliance certifications. See [SOC 2 readiness](/guide/soc2-readiness) for what exists vs what still needs a CPA engagement. Ask [support@autlantic.com](mailto:support@autlantic.com) if you need a current statement for procurement.

## Subprocessors

Infrastructure used to run Autlantic Billing (hosted API, portal, worker, docs). This list is intentional and minimal; contact support for updates. Confirm against [autlantic.com/dpa](https://autlantic.com/dpa) before signing.

| Subprocessor | Role |
|--------------|------|
| Railway | Hosting and managed database for billing API, portal, worker, and docs |
| Cloudflare | DNS and edge protection (where configured) |
| Sentry | Application error monitoring |
| Resend | Transactional email for portal auth and merchant notifications |
| Cloudinary | Merchant logo and branding images (where configured) |
| Google | Optional portal Google sign-in; Firebase Cloud Messaging for portal mobile push (where configured) |
| GitHub | Source control and CI for the public SDK |
| npm / PyPI / other package registries | Distribution of published client libraries |

Canonical schedule: [autlantic.com/dpa](https://autlantic.com/dpa). Public Base RPC endpoints, block explorers, and wallet software used for on-chain settlement are not listed as Autlantic subprocessors here. Stripe, Telegram, Discord, and other Platform-only vendors are out of scope for Billing.

## Legal

| Document | Link |
|----------|------|
| Terms of Service | [autlantic.com/terms](https://autlantic.com/terms) |
| Privacy Policy | [autlantic.com/privacy](https://autlantic.com/privacy) |
| Refund Policy | [autlantic.com/refunds](https://autlantic.com/refunds) |
| Security FAQ | [autlantic.com/security](https://autlantic.com/security) |
| DPA outline | [autlantic.com/dpa](https://autlantic.com/dpa) |
| Billing Terms (portal) | [portal.autlantic.com/terms](https://portal.autlantic.com/terms) |
| About Autlantic Limited | [autlantic.com/about](https://autlantic.com/about) |

## Data Processing Agreement (DPA)

A Data Processing Agreement outline for negotiation is published at **[autlantic.com/dpa](https://autlantic.com/dpa)**. Request a counsel-reviewed draft at **[support@autlantic.com](mailto:support@autlantic.com)**.

A short docs mirror remains at [DPA outline template](/resources/dpa-template). It is **not** legal advice and is **not** an executed agreement.

## Status

Live checks: **[status.autlantic.com](https://status.autlantic.com)**. Operator notes: [Status](/resources/status).
