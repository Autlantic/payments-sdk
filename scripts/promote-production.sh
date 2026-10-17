#!/usr/bin/env bash
# Promote payments-sdk main → production with ff-only only.
# Never creates merge commits. Exits non-zero if branches diverged.
set -euo pipefail
cd "$(dirname "$0")/.."

git fetch origin main production
git checkout production
git merge --ff-only origin/main
git push origin production
git checkout main

main_sha=$(git rev-parse origin/main)
prod_sha=$(git rev-parse origin/production)
if [[ "$main_sha" != "$prod_sha" ]]; then
  echo "error: after promote, origin/production ($prod_sha) != origin/main ($main_sha)" >&2
  exit 1
fi
echo "ok: production == main ($main_sha)"
