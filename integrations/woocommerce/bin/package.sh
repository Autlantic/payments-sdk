#!/usr/bin/env bash
# Build a WordPress.org-ready zip with the PHP SDK vendored (no Composer on the store).
# Intentionally omits CurlTransport so Plugin Check does not flag curl_*.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PLUGIN="$(cd "$HERE/.." && pwd)"
REPO="$(cd "$PLUGIN/../.." && pwd)"
SDK="$REPO/sdks/php"
OUT="${1:-$PLUGIN/dist}"

if [[ ! -f "$SDK/src/AutlanticBilling.php" ]]; then
  echo "PHP SDK not found at $SDK" >&2
  exit 1
fi

VERSION="$(php -r '
  $src = file_get_contents($argv[1]);
  if (!preg_match("/^\\s*\\*\\s*Version:\\s*(\\S+)/m", $src, $m)) {
    fwrite(STDERR, "Could not read plugin version\n");
    exit(1);
  }
  echo $m[1];
' "$PLUGIN/autlantic-billing.php")"

STAGE="$(mktemp -d)"
ROOT="$STAGE/autlantic-billing-for-woocommerce"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

mkdir -p "$ROOT/vendor/autlantic/billing"

rsync -a \
  --exclude '/vendor' \
  --exclude '/dist' \
  --exclude '/bin' \
  --exclude '/README.md' \
  --exclude 'composer.lock' \
  --exclude '.DS_Store' \
  --exclude '.*' \
  "$PLUGIN/" "$ROOT/"

rsync -a \
  --exclude '/vendor' \
  --exclude '/tests' \
  --exclude '/.phpunit.cache' \
  --exclude '/.github' \
  --exclude 'composer.lock' \
  --exclude 'phpunit.xml' \
  --exclude 'README.md' \
  --exclude '.DS_Store' \
  --exclude '.*' \
  "$SDK/" "$ROOT/vendor/autlantic/billing/"

# WordPress.org package must not ship curl_* (Plugin Check static scan).
rm -f "$ROOT/vendor/autlantic/billing/src/CurlTransport.php"

python3 - "$ROOT/composer.json" <<'PY'
import json, sys
path = sys.argv[1]
with open(path) as f:
    data = json.load(f)
data.pop("repositories", None)
data.setdefault("require", {}).pop("autlantic/billing", None)
data.setdefault("autoload", {}).setdefault("psr-4", {})
data["autoload"]["psr-4"]["Autlantic\\Billing\\"] = "vendor/autlantic/billing/src/"
data.setdefault("config", {})["platform-check"] = False
with open(path, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY

(
  cd "$ROOT"
  composer dump-autoload -o --no-dev --no-interaction
)

# Remove Composer platform_check exit() helper if still emitted.
rm -f "$ROOT/vendor/composer/platform_check.php"
if [[ -f "$ROOT/vendor/composer/autoload_real.php" ]]; then
  perl -0pi -e 's/\s*if \(file_exists\(__DIR__ \. '\''\/platform_check\.php'\''\)\) \{\s*require __DIR__ \. '\''\/platform_check\.php'\'';\s*\}//s' \
    "$ROOT/vendor/composer/autoload_real.php" || true
fi

php "$HERE/smoke.php" "$ROOT"
php "$HERE/wporg-check.php" "$ROOT"

mkdir -p "$OUT"
ZIP="$OUT/autlantic-billing-${VERSION}.zip"
rm -f "$ZIP"
(
  cd "$STAGE"
  zip -rq "$ZIP" autlantic-billing-for-woocommerce -x '*.DS_Store'
)

php "$HERE/wporg-check.php" "$ZIP"

echo "Wrote $ZIP"
