# SDK README standard

All packages under `sdks/` and `packages/payments-recurring` follow the **same first look** as the repo root [README](../README.md): Autlantic icon, centered title, USDC/Base line, badge row, then Install → Quick start → Docs.

## Brand assets (CDN — required for GitHub/npm/PyPI)

| Asset | URL |
|-------|-----|
| Icon | `https://autlantic.com/brand/autlantic-icon-1024-master.png` |
| Docs badge color | `5672cd` |
| Product | https://autlantic.com |
| Docs | https://docs.autlantic.com |

## Header (every SDK README)

```html
<p align="center">
  <img src="https://autlantic.com/brand/autlantic-icon-1024-master.png" alt="Autlantic" width="96" height="96" />
</p>

<h1 align="center">Autlantic Billing — {Language}</h1>

<p align="center">
  <strong>USDC payments on Base</strong><br />
  {One sentence: server client OR mobile Checkout presenter.}
</p>

<p align="center">
  <a href="https://docs.autlantic.com/api/{slug}"><img src="https://img.shields.io/badge/docs-docs.autlantic.com-5672cd?style=flat-square" alt="Docs" /></a>
  <!-- package badge when published -->
  <a href="https://github.com/Autlantic/payments-sdk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://autlantic.com"><img src="https://img.shields.io/badge/product-autlantic.com-111827?style=flat-square" alt="Autlantic" /></a>
</p>

---
```

## Section order

### Server SDKs (Python, Go, PHP, Java, .NET)

1. **Why this SDK** — same Billing API as Node; non-custodial USDC on Base; secrets server-only  
2. **Install**  
3. **Quick start** — `fromEnv` / create payment link (+ return URLs)  
4. **Webhooks** — verify `x-autlantic-signature`  
5. **Environment** — table of `AUTLANTIC_BILLING_*`  
6. **Documentation** — link table (API page, Languages, Mobile, Webhooks, legal)  
7. **Develop** — test command  
8. **License** — MIT · Autlantic Limited (UK 17422039)

### Mobile SDKs (iOS, Android, Flutter, React Native)

1. **Why this SDK** — Checkout presenter only; no API keys; hosted `checkoutUrl`  
2. **Install**  
3. **Quick start** — `present(...)`  
4. **Backend contract** — create session → present → deep link → webhook unlock → poll your API  
5. **Documentation** — same table style  
6. **Develop** — analyze / sample path  
7. **License**

## Rules

- Lead with Autlantic branding, not the language name alone.
- One product sentence: **USDC payments on Base**.
- Never show embedding `abk_*` or webhook secrets in mobile READMEs.
- Point package docs to `https://docs.autlantic.com/api/{slug}`.
- Cross-link the monorepo: “Part of [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk).”
- Keep Quick start short (one create + one webhook or one present).

## VitePress API pages

Same voice at the top of every `apps/docs/docs/api/*.md`:

```markdown
# {Language} SDK

Official Autlantic Billing **{server client | mobile Checkout}** for {platform}.
Part of the [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk) · [Languages](/guide/languages).

**USDC on Base** · secrets {server-only | never in the app}.
```

Then Install → Quick start → … → Related (always include Languages, Mobile, Security).
