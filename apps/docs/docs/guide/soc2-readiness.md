# SOC 2 readiness (not a certification)

**Autlantic Billing is not SOC 2 certified.** This page is an internal/procurement readiness outline so merchants know what exists today and what still requires process work with a CPA firm.

Contact: [support@autlantic.com](mailto:support@autlantic.com).

## Already in product

| Control area | What exists |
|--------------|-------------|
| Access | Merchant portal accounts, email verification, API keys with rotate, Test vs Live separation |
| Audit | Merchant audit log in the portal for key and webhook admin actions |
| Change management | GitHub PRs, CI, Railway deploys from `production` only |
| Availability | `GET /healthz` on Billing API; public [status page](/resources/status) |
| Encryption in transit | HTTPS on hosted API, portal, docs, and status |
| Secrets | Env-based secrets on Railway; webhook signing secrets per portal endpoint |
| Vulnerability intake | [SECURITY.md](https://github.com/Autlantic/payments-sdk/blob/main/SECURITY.md) / support@autlantic.com |
| Subprocessors | Listed on the [Trust center](/guide/trust) |

## Still required for a Type I / Type II report

These are **not** claimed as complete:

1. Written information security policies (access, change, incident, vendor) signed by management.
2. Formal access reviews and offboarding checklist with evidence.
3. Incident response runbooks with tabletop evidence.
4. Vendor / subprocessor due diligence records.
5. Continuous monitoring evidence package for the audit period (Type II).
6. Engagement of an independent CPA firm and scoped system description.

## SSO

Merchant portal supports optional **Google OIDC** when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set on the portal service. SAML / enterprise IdP is not available yet.

## Related

- [Trust center](/guide/trust)
- [Security guide](/guide/security)
- [Status](/resources/status)
- [DPA outline template](/resources/dpa-template)
