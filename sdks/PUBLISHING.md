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

## Java (Maven Central)

Gradle + CI are wired under `sdks/java` and `.github/workflows/publish-java.yml` (same Maven/GPG secrets as Android). Do **not** tag until secrets + `com.autlantic` namespace are ready.

Library: `com.autlantic:billing`. Until Central, use Gradle `includeBuild` / project dependency (see example `examples/mobile-checkout/java`).

### Local publish (when secrets exist)

```bash
cd sdks/java
export ORG_GRADLE_PROJECT_mavenCentralUsername=...
export ORG_GRADLE_PROJECT_mavenCentralPassword=...
export ORG_GRADLE_PROJECT_signingInMemoryKey="$(cat secret.asc)"
export ORG_GRADLE_PROJECT_signingInMemoryKeyId=...
export ORG_GRADLE_PROJECT_signingInMemoryKeyPassword=...
./gradlew publishAndReleaseToMavenCentral --no-daemon
```

### Publish via tag (after secrets + verified namespace)

```bash
# bump VERSION_NAME in sdks/java/gradle.properties (+ Version.java) if needed
git tag -a sdks/java/v0.1.0 -m "com.autlantic:billing 0.1.0"
git push origin sdks/java/v0.1.0
```

Actions runs `./gradlew publishAndReleaseToMavenCentral`. Consumers: `implementation("com.autlantic:billing:0.1.0")`.

## .NET (NuGet)

Package: [`Autlantic.Billing`](https://www.nuget.org/packages/Autlantic.Billing) **0.1.0** published (`sdks/dotnet`, `net8.0`).

```bash
cd sdks/dotnet
dotnet pack src/Autlantic.Billing/Autlantic.Billing.csproj -c Release -o ./nupkg
dotnet nuget push ./nupkg/Autlantic.Billing.*.nupkg \
  --api-key "$NUGET_API_KEY" \
  --source https://api.nuget.org/v3/index.json
```

Republish: bump `Version` in `Autlantic.Billing.csproj`, pack, push. Optional later: GitHub Actions + trusted publishing / `NUGET_API_KEY` secret + tag `sdks/dotnet/v*`.

Install: `dotnet add package Autlantic.Billing --version 0.1.0`.

## Flutter (pub.dev)

Package: [`autlantic_checkout`](https://pub.dev/packages/autlantic_checkout) **0.1.0** published (`sdks/flutter`).

```bash
cd sdks/flutter
flutter pub publish --dry-run
flutter pub publish   # bump version in pubspec.yaml first for republish
```

Optional: transfer package to verified publisher `autlantic.com` on pub.dev Admin.

Install: `autlantic_checkout: ^0.1.0`.

## React Native (npm)

Package: [`@autlantic/checkout`](https://www.npmjs.com/package/@autlantic/checkout) **0.1.0** published (`sdks/react-native`, tag `sdks/react-native/v0.1.0`).

```bash
cd sdks/react-native
npm run typescript
npm publish --access public   # requires npm org @autlantic; bump version first for republish
```

Install: `npm install @autlantic/checkout`. From source: `npm install github:Autlantic/payments-sdk#sdks/react-native/v0.1.0` or path install. Metro may need `watchFolders` / `nodeModulesPaths` for monorepo path installs.

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

## Consumer apps (after publish)

**Railway rule:** every live Autlantic Railway service deploys from **`production`**, never `main`. See this repo’s [DEPLOY.md](../DEPLOY.md).

Libraries still **publish packages** from **`main` + tags**. Hosted Autlantic apps promote pin bumps to their `production` branch before calling a change live.

1. Publish this SDK (`main` + tag / registry).
2. Bump the pin in each Autlantic app that consumes it (private app repos), merge to their `main`.
3. Promote those apps `main` → `staging` → `production`.
4. For docs.autlantic.com changes in this repo: promote `main` → `production` after merging.
5. Only then call the bump / docs update **shipped**.

Do not point Railway at `main`.

## Phase 0 checklist (ops)

| Item | Status |
|------|--------|
| Packagist submit | **You:** [Submit package](https://packagist.org/packages/submit) → `https://github.com/Autlantic/billing-php` → enable GitHub sync |
| `BILLING_PHP_TOKEN` | **You:** PAT with `contents:write` on `billing-php` (for mirror sync on `sdks/php/v*` tags) |
| Maven Central namespace | **You:** verify **`com.autlantic`** on [central.sonatype.com](https://central.sonatype.com/) |
| Maven/GPG GitHub secrets | **Still required:** `MAVEN_CENTRAL_USERNAME`, `MAVEN_CENTRAL_PASSWORD`, `GPG_SIGNING_KEY`, `GPG_SIGNING_KEY_ID`, `GPG_SIGNING_PASSWORD` (shared by Android + Java) |
| Android workflow | Ready: `.github/workflows/publish-android.yml` on `sdks/android/v*` |
| Java workflow | **Added:** `.github/workflows/publish-java.yml` on `sdks/java/v*` |
| Tag / publish Android or Java | **Do not** until secrets + namespace Verified |

After secrets: tag Android + Java; confirm Central sync; update docs to “Available on Maven Central” / Packagist.

Already published: NuGet (`Autlantic.Billing`), pub.dev (`autlantic_checkout`), npm (`@autlantic/checkout`) **0.1.0**.
