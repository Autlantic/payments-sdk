# How to publish non-TypeScript SDKs

Node/npm is already live (`@autlantic/payments-recurring`). Use this for Python, iOS, Android.

## iOS (SPM) — no new account

Swift Package Manager installs from **GitHub**. Already usable.

Consumers in Xcode:

1. File → Add Package Dependencies
2. URL: `https://github.com/Autlantic/payments-sdk.git`
3. Dependency rule: version / branch / commit
4. Product: **AutlanticCheckout** (package root is `sdks/ios`)

If Xcode needs a path: use “Add Local…” during development, or document:

```text
https://github.com/Autlantic/payments-sdk
Package path: sdks/ios
```

Optional: tag releases as `sdks/ios/v0.1.0` for clearer versioning.

**You:** nothing to create. **We:** tag when you want a versioned release.

---

## Python (PyPI) — you create the account (once)

`autlantic-billing` is free on PyPI (not taken). Workflow is ready: `.github/workflows/publish-python.yml`.

### A. Create accounts (you)

1. Open https://pypi.org/account/register/  
   Use `support@autlantic.com` or your Autlantic org email.
2. Verify email; turn on 2FA.
3. (Recommended) Also register https://test.pypi.org/account/register/ for dry runs.

### B. Pending trusted publisher (you, no API token)

1. Log in → https://pypi.org/manage/account/publishing/
2. Under **Add a new pending publisher**:
   - PyPI project name: `autlantic-billing`
   - Owner: `Autlantic` (GitHub org that owns payments-sdk)
   - Repository: `payments-sdk`
   - Workflow name: `publish-python.yml`
   - Environment name: `pypi`
3. Save.

### C. GitHub environment (you or agent with repo admin)

1. https://github.com/Autlantic/payments-sdk/settings/environments
2. Create environment named **`pypi`** (must match workflow + PyPI publisher).

### D. First publish (after A–C)

```bash
cd ~/payments-sdk
# bump version in sdks/python/pyproject.toml if needed
git tag -a sdks/python/v0.1.0 -m "autlantic-billing 0.1.0"
git push origin sdks/python/v0.1.0
```

GitHub Actions builds and uploads to PyPI. Then:

```bash
pip install autlantic-billing
```

**I cannot** create the PyPI account or click “Add pending publisher” for you.

---

## Android (Maven) — you create the account (once)

Two options:

### Option 1 — GitHub Packages (faster)

Uses your existing GitHub org. No Sonatype.

1. Ensure `GITHUB_TOKEN` / `write:packages` on the publishing workflow.
2. Publish `com.autlantic:checkout` to `https://maven.pkg.github.com/Autlantic/payments-sdk`.
3. Consumers need a GitHub token to download (private registry feel) **or** you make the package public under org settings.

Good for internal / early partners. Less ideal for “anyone `implementation(...)` with no token”.

### Option 2 — Maven Central (public, Stripe-like)

1. Create account at https://central.sonatype.com/  
2. Claim namespace `com.autlantic` (proves you control `autlantic.com` via DNS TXT or similar).
3. Configure GPG signing + publish from CI.

This takes longer (namespace approval). Do after PyPI if Android partners need a public dependency.

**I cannot** create Sonatype / verify DNS for you. I can add the Gradle publish config once you pick Option 1 or 2.

---

## Suggested order

1. **You:** PyPI register + pending publisher + GitHub `pypi` environment  
2. **Agent:** tag `sdks/python/v0.1.0` and confirm Actions succeeded  
3. **You (optional):** Sonatype / DNS for Maven Central, or approve GitHub Packages  
4. **Agent:** wire Android publish + tag `sdks/ios/v0.1.0`
