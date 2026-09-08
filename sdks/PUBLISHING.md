# How to publish non-TypeScript SDKs

Node/npm and Python/PyPI are live. iOS uses SPM from Git. Android publishes to Maven Central via GitHub Actions.

## iOS (SPM)

Already tagged: `sdks/ios/v0.1.0`. Xcode → Add Package → `https://github.com/Autlantic/payments-sdk.git` → product **AutlanticCheckout**.

## Python (PyPI)

Already live: `pip install autlantic-billing`. Re-publish by bumping `sdks/python/pyproject.toml` and tagging `sdks/python/v*`.

## PHP (Composer / Packagist)

1. Tag `sdks/php/v0.1.0` (and push).
2. On [packagist.org](https://packagist.org) → Submit → `https://github.com/Autlantic/payments-sdk` (or sync GitHub org).
3. Packagist may need a custom path / monorepo package: use the Packagist “Custom package” / subtree or [Satis](https://getcomposer.org/doc/articles/handling-private-packages.md) if the root composer.json is not the package. For this repo the package lives at `sdks/php`; submit with **Git** URL and ensure Packagist discovers `sdks/php/composer.json` via a dedicated repo mirror **or** publish from a `sdks/php` subtree split.

Simplest path for merchants today (before Packagist):

```json
{
  "repositories": [{
    "type": "vcs",
    "url": "https://github.com/Autlantic/payments-sdk.git"
  }],
  "require": {
    "autlantic/billing": "dev-main"
  }
}
```

Composer VCS installs look for `composer.json` at the repo root. For monorepo install until a Packagist subtree exists, use a **path** or **package** repository pointing at `sdks/php`, or a git subtree split to `Autlantic/billing-php`.

Recommended: create (or subtree-split) a thin `Autlantic/billing-php` repo whose root is `sdks/php`, then `composer require autlantic/billing`.

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

1. You: confirm `com.autlantic` **Verified** + add the five GitHub secrets  
2. Agent: tag `sdks/android/v0.1.0` and confirm Actions + Maven Central sync  
3. Agent: update docs Android page to “Available on Maven Central”
