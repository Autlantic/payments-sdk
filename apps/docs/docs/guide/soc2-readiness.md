# SOC 2 readiness (not a certification)

**Autlantic Billing is not SOC 2 certified.** This page is a procurement readiness outline so merchants know what exists today and what still requires process work with a CPA firm.

Canonical company page (preferred for RFPs): [autlantic.com/compliance](https://autlantic.com/compliance)

Contact: [support@autlantic.com](mailto:support@autlantic.com).

## Already in product

| Control area | What exists |
|--------------|-------------|
| Access | Merchant portal accounts, email verification, API keys with rotate, Test vs Live separation |
| Enterprise SSO | WorkOS-backed SAML / OIDC for the Billing merchant portal, on request (invite-only seats). Optional Google OIDC remains available when configured |
| Audit | Merchant audit log in the portal for key and webhook admin actions |
| Change management | GitHub PRs, CI, Railway deploys from `production` only |
| Data store | Managed Billing database on Railway for billing API, portal, and worker |
| Monitoring | Sentry error monitoring on billing-api, portal, and worker |
| Availability | `GET /healthz` on Billing API; public [status page](/resources/status) |
| Encryption in transit | HTTPS on hosted API, portal, docs, and status |
| Secrets | Env-based secrets on Railway; webhook signing secrets per portal endpoint |
| Vulnerability intake | [SECURITY.md](https://github.com/Autlantic/payments-sdk/blob/main/SECURITY.md) / support@autlantic.com |
| Legal drafts | [DPA outline](https://autlantic.com/dpa) and [Security FAQ](https://autlantic.com/security) on the company site |
| Subprocessors | Listed on the [Trust center](/guide/trust) and [DPA](https://autlantic.com/dpa) |

## Still required for a Type I / Type II report

These are **not** claimed as complete:

1. Written information security policies (access, change, incident, vendor) signed by management.
2. Formal access reviews and offboarding checklist with evidence.
3. Incident response runbooks with tabletop evidence.
4. Vendor / subprocessor due diligence records.
5. Continuous monitoring evidence package for the audit period (Type II).
6. Engagement of an independent CPA firm and scoped system description.

## How we talk about this

- Preferred: “SOC 2 readiness in progress” or “not SOC 2 certified; see [compliance](https://autlantic.com/compliance).”
- Avoid: “SOC 2 certified,” “SOC 2 compliant,” or implying a report exists when it does not.

## Related

- [Company compliance](https://autlantic.com/compliance)
- [Trust center](/guide/trust)
- [Security guide](/guide/security)
- [Status](/resources/status)
- [DPA outline template](/resources/dpa-template)
