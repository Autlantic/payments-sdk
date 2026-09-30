# Publishing @autlantic/* to npm

## Packages (publish order)

1. `@autlantic/payments-recurring-core`
2. `@autlantic/chain-evm`
3. `@autlantic/billing-engine`
4. `@autlantic/payments-recurring`

## Prerequisites

- npm login as a user with access to scope `@autlantic`
- Prefer a clean git tree for the packages you publish

```bash
npm login
```

## Hard rule: use pnpm publish, never bare `npm publish`

`pnpm publish` rewrites `workspace:*` dependency ranges to real registry versions.
Bare `npm publish` leaves `workspace:*` on npm and **breaks every consumer install** (see broken `billing-engine@0.3.11`; use `0.3.12+`).

## Publish

```bash
pnpm check
pnpm publish:sdk
```

Or one package:

```bash
pnpm --filter @autlantic/billing-engine publish --access public
# if untracked files block git checks:
pnpm --filter @autlantic/billing-engine publish --access public --no-git-checks
```

Confirm before bumping consumers:

```bash
npm view @autlantic/billing-engine version
npm view @autlantic/billing-engine dependencies
# dependencies must be numeric versions, never workspace:*
```

## After publish

1. Bump pins in **billing-hosting** (and platform if needed) → `pnpm install`
2. Wire against published exports only
3. Promote

## Version bumps

Bump `version` in the package `package.json` files together, update [apps/docs/docs/resources/changelog.md](./apps/docs/docs/resources/changelog.md), then publish.
