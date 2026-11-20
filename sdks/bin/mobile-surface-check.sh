#!/usr/bin/env bash
# Static + unit gates for mobile Checkout presenters (no API keys in surface).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "== surface: present APIs must not take secrets =="
for f in \
  sdks/ios/Sources/AutlanticCheckout/AutlanticCheckout.swift \
  sdks/android/autlantic-checkout/src/main/java/com/autlantic/checkout/AutlanticCheckout.kt \
  sdks/flutter/lib/autlantic_checkout.dart \
  sdks/react-native/src/index.ts
do
  if grep -Eiq 'func present\([^)]*apiKey|fun present\([^)]*apiKey|present\([^)]*apiKey|abk_test_|abk_live_|webhookSecret' "$f"; then
    echo "FAIL secret surface in $f"
    exit 1
  fi
  echo "PASS $f"
done

echo "== flutter unit =="
if command -v flutter >/dev/null 2>&1; then
  (cd sdks/flutter && flutter test)
  echo "PASS flutter test"
else
  echo "SKIP flutter (not installed)"
fi

echo "== react-native validation =="
(cd sdks/react-native && npx --yes tsx --test src/index.test.ts)
echo "PASS react-native test"

echo "== example mobile-checkout =="
# Force in-process sandbox so a leftover hosted key in the shell cannot break CI.
env -u AUTLANTIC_BILLING_API_KEY -u AUTLANTIC_BILLING_API_URL \
  -u AUTLANTIC_BILLING_WEBHOOK_SECRET -u AUTLANTIC_BILLING_MERCHANT_ID \
  pnpm --filter @autlantic/example-mobile-checkout test
echo "PASS example-mobile-checkout test"

echo "== android unit =="
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$JAVA_HOME/bin:$PATH"
if [[ -d "$ANDROID_HOME" ]]; then
  echo "sdk.dir=$ANDROID_HOME" > sdks/android/local.properties
  (cd sdks/android && ./gradlew :autlantic-checkout:testDebugUnitTest --quiet)
  echo "PASS android unit"
else
  echo "SKIP android (ANDROID_HOME missing)"
fi


echo "MOBILE_SURFACE_CHECK_OK"
