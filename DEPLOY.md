# Deploy and branches

**One rule for Railway:** live services deploy from **`production` only** — never from `main`.

| Repo type | Branches | What ships from where |
|-----------|----------|------------------------|
| Apps (`platform`, `billing-hosting`) | `main` → `staging` → `production` | Railway staging/production |
| This repo (`payments-sdk`) | `main` + **`production`** | Packages/tags from **`main`**; docs + example-store Railway from **`production`** |
| Pure mirrors (`billing-php`) | `main` only | No Railway |

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
- App deploy: [billing-hosting DEPLOY.md](https://github.com/Autlantic/billing-hosting/blob/main/DEPLOY.md) · [platform DEPLOY.md](https://github.com/Autlantic/platform/blob/production/DEPLOY.md)
