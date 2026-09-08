# How to publish non-TypeScript SDKs

Node/npm and Python/PyPI are live. iOS uses SPM from Git. Android publishes to Maven Central via GitHub Actions. PHP mirrors to [`Autlantic/billing-php`](https://github.com/Autlantic/billing-php) for Composer/Packagist.

## iOS (SPM)

Already tagged: `sdks/ios/v0.1.0`. Xcode → Add Package → `https://github.com/Autlantic/payments-sdk.git` → product **AutlanticCheckout**.

## Python (PyPI)

Already live: `pip install autlantic-billing`. Re-publish by bumping `sdks/python/pyproject.toml` and tagging `sdks/python/v*`.

## PHP (Composer / Packagist)

Source of truth: `sdks/php` in this repo. Packagist-friendly mirror: **https://github.com/Autlantic/billing-php** (root = package).

### One-time

1. Mirror already seeded with `v0.1.0`.
2. Add GitHub Actions secret **`BILLING_PHP_TOKEN`** on payments-sdk (PAT with `contents:write` on `Autlantic/billing-php`) so `.github/workflows/sync-php-mirror.yml` can push on `sdks/php/v*` tags.
3. [packagist.org](https://packagist.org) → Submit → `https://github.com/Autlantic/billing-php` → enable GitHub sync.

Until Packagist indexes:

```bash
composer config repositories.autlantic vcs https://github.com/Autlantic/billing-php.git
composer require autlantic/billing:^0.1
```

### Re-publish

```bash
# bump version in sdks/php/composer.json + Version.php
git tag -a sdks/php/v0.1.1 -m "autlantic/billing 0.1.1"
git push origin sdks/php/v0.1.1
# workflow syncs billing-php + tag v0.1.1
```

## Java (Maven Central later)

Library lives in `sdks/java` (`com.autlantic:billing`). Same `com.autlantic` namespace as Android Checkout — publish after namespace Verified + GPG/Maven secrets (see Android section). Until then, use Gradle `includeBuild` / project dependency (see example `examples/mobile-checkout/java`).

## .NET (NuGet later)

Library lives in `sdks/dotnet` (`Autlantic.Billing` **0.1.0**, `net8.0`). Until nuget.org publish:

```bash
cd sdks/dotnet && dotnet pack -c Release
# or ProjectReference from examples/mobile-checkout/dotnet
```

Suggested publish flow: bump `Version` in `Autlantic.Billing.csproj` + `Version.SdkVersion`, tag `sdks/dotnet/v*`, push package with `dotnet nuget push` (API key / GitHub Actions secret later).

## Android (Maven Central)

Gradle + CI are wired under `sdks/android` and `.github/workflows/publish-android.yml`.

### You (one-time)

1. https://central.sonatype.com/ → **Namespaces** → verify **`com.autlantic`** (DNS TXT already on `autlantic.com`).
2. Account → **Generate User Token** → save username + password.
3. Create a GPG key for signing (or use an existing Autlantic release key):

```bash
gpg --full-generate-key   # RSA 4096, no expiry (or set one)
gpg --list-secret-keys --keyid-format LONG
gpg --export-secret-keys -a KEYID > secret.asc
```

4. GitHub repo **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|--------|--------|
| `MAVEN_CENTRAL_USERNAME` | Central portal token username |
| `MAVEN_CENTRAL_PASSWORD` | Central portal token password |
| `GPG_SIGNING_KEY` | Full contents of `secret.asc` (ASCII armored private key) |
| `GPG_SIGNING_KEY_ID` | 8-char or long key id |
| `GPG_SIGNING_PASSWORD` | GPG passphrase |
| `BILLING_PHP_TOKEN` | PAT for PHP mirror sync (optional until next PHP tag) |

5. Optional: GitHub Environment named `maven-central` (not required by current workflow).

### Publish (after secrets + verified namespace)

```bash
cd ~/payments-sdk
# bump VERSION_NAME in sdks/android/gradle.properties if needed
git tag -a sdks/android/v0.1.0 -m "com.autlantic:checkout 0.1.0"
git push origin sdks/android/v0.1.0
```

Actions runs `./gradlew :autlantic-checkout:publishAndReleaseToMavenCentral`.

Consumers:

```kotlin
implementation("com.autlantic:checkout:0.1.0")
```

## Suggested finish line

1. You: confirm `com.autlantic` **Verified** + add Maven/GPG secrets; submit **billing-php** on Packagist; add `BILLING_PHP_TOKEN`
2. Agent: tag Android + Java Maven releases; confirm Central sync
3. Agent: update docs to “Available on Maven Central” / Packagist
