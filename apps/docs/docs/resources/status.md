# Status page

Merchants and operators should use **[status.autlantic.com](https://status.autlantic.com)** as the public status surface when it is configured.

## Recommended setup

1. Point `status.autlantic.com` at a status provider (Better Stack, or similar).
2. Monitor the hosted Billing API at **https://billing.autlantic.com**.
3. Publish incidents and maintenance windows on the status page so integrators have a single place to check.

## Health checks

Probe the Billing API with an unauthenticated GET:

| Path | Response | Use |
|------|----------|-----|
| `GET /healthz` | `{ "ok": true }` | Lightweight liveness for uptime monitors |
| `GET /health` | JSON including `ok`, service name, chain metadata | Richer diagnostics (not required for basic uptime) |

Example:

```bash
curl -sS https://billing.autlantic.com/healthz
# {"ok":true}
```

Configure Better Stack (or equivalent) to poll `https://billing.autlantic.com/healthz` on a short interval from multiple regions. Alert on non-2xx or body that is not `ok: true`.

Optional: also monitor the merchant portal and docs origins if you want full stack visibility. Prefer the Billing API health endpoint as the primary signal for payment availability.

## Related

- [Trust center](/guide/trust)
- [Deploy docs on Railway](/resources/deploy-railway) (operators)
