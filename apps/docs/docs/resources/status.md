# Status page

Live public surface: **[status.autlantic.com](https://status.autlantic.com)**.

The status service probes production origins every request (and the page refreshes every 60 seconds):

| Check | Target |
|-------|--------|
| Billing API | `GET https://billing.autlantic.com/healthz` → `{ "ok": true }` |
| Merchant portal | `GET https://portal.autlantic.com/` |
| Docs | `GET https://docs.autlantic.com/` |

Machine-readable: `GET https://status.autlantic.com/api/status` and `GET https://status.autlantic.com/healthz`.

## Operator setup (Railway)

1. In the payments-sdk Railway project, add a service with config file `railway.status.toml`.
2. Set the source branch to **`production`** (never `main`).
3. Attach custom domain **`status.autlantic.com`** (Cloudflare DNS should already point at Cloudflare/Railway).

Optional: also configure Better Stack (or similar) to poll `https://billing.autlantic.com/healthz` and page on-call for non-2xx or body that is not `ok: true`. Prefer the Billing API health endpoint as the primary signal for payment availability.

## Related

- [Trust center](/guide/trust)
- [SOC 2 readiness](/guide/soc2-readiness)
- [Deploy docs on Railway](/resources/deploy-railway) (operators)
