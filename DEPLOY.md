# Deploy and branches

**One rule for Railway:** live Autlantic Railway services deploy from **`production` only** — never from `main`.

| Surface | Branches | What ships from where |
|---------|----------|------------------------|
| This repo (`payments-sdk`) | `main` + **`production`** | Packages/tags from **`main`**; docs + example-store Railway from **`production`** |
| PHP mirror (`billing-php`) | `main` only | No Railway |
| Autlantic hosted apps | `main` → `staging` → `production` | Railway staging/production (private app repos) |

## Branches (this repo)

| Branch | Purpose | Railway |
|--------|---------|---------|
| `main` | PRs, SDK source of truth, npm/PyPI/NuGet/pub tags | **Not** for docs/store deploy |
| `production` | What Railway builds for docs.autlantic.com (+ example store) | **Yes** — docs / example-store |

Optional later: add `staging` if you want a docs preview env. Until then, promote `main` → `production` before docs go live.

## Promotion (docs / example store)

```bash
git fetch origin
git checkout production
git merge --ff-only origin/main   # or cherry-pick specific docs commits
git push origin production
```

Package publishes still happen from **`main`** (or version tags on `main`). Promoting to `production` only updates Railway sites.

## Railway (you must set once)

For each payments-sdk Railway service (`railway.docs.toml`, `railway.example-store.toml`):

1. Settings → Source → branch = **`production`** (not `main`)
2. Redeploy once after switching

## Related

- [Deploy docs on Railway](./apps/docs/docs/resources/deploy-railway.md)
- [sdks/PUBLISHING.md](./sdks/PUBLISHING.md)
- Product docs: [docs.autlantic.com](https://docs.autlantic.com)
