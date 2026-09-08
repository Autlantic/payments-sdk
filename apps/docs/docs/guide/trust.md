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

Product security page: [autlantic.com/security](https://autlantic.com/security).

This page does **not** claim SOC 2 or other formal compliance certifications. Ask [support@autlantic.com](mailto:support@autlantic.com) if you need a current statement for procurement.

## Subprocessors

Infrastructure used to run Autlantic Billing (hosted API, portal, worker, docs). This list is intentional and minimal; contact support for updates.

| Subprocessor | Role |
|--------------|------|
| Railway | Hosting for billing API, portal, worker, and docs |
| GitHub | Source control and CI for the public SDK |
| npm / PyPI / other package registries | Distribution of published client libraries |

RPC providers, block explorers, and wallet software used by merchants or end users are chosen by those parties and are not Autlantic subprocessors.

## Legal

| Document | Link |
|----------|------|
| Terms of Service | [autlantic.com/terms](https://autlantic.com/terms) |
| Privacy Policy | [autlantic.com/privacy](https://autlantic.com/privacy) |
| Refund Policy | [autlantic.com/refunds](https://autlantic.com/refunds) |
| Billing Terms (portal) | [portal.autlantic.com/terms](https://portal.autlantic.com/terms) |
| About Autlantic Limited | [autlantic.com/about](https://autlantic.com/about) |

## Data Processing Agreement (DPA)

A Data Processing Agreement is available on request at **[support@autlantic.com](mailto:support@autlantic.com)**.

A short outline template for negotiation (starting point only, pending Autlantic Limited counsel review) is published at [/legal/dpa-template.md](/legal/dpa-template.md). It is **not** legal advice and is **not** an executed agreement.

## Status

Operational status guidance for merchants and operators: [Status](/resources/status).
