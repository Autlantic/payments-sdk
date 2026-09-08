<p align="center">
  <img src="https://autlantic.com/brand/autlantic-icon-1024-master.png" alt="Autlantic" width="96" height="96" />
</p>

<h1 align="center">Autlantic Billing — Python</h1>

<p align="center">
  <strong>USDC payments on Base</strong><br />
  Official server client for the hosted Autlantic Billing API.
</p>

<p align="center">
  <a href="https://docs.autlantic.com/api/python"><img src="https://img.shields.io/badge/docs-docs.autlantic.com-5672cd?style=flat-square" alt="Docs" /></a>
  <a href="https://pypi.org/project/autlantic-billing/"><img src="https://img.shields.io/pypi/v/autlantic-billing?style=flat-square&color=5672cd" alt="PyPI" /></a>
  <a href="https://github.com/Autlantic/payments-sdk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://autlantic.com"><img src="https://img.shields.io/badge/product-autlantic.com-111827?style=flat-square" alt="Autlantic" /></a>
</p>

---

## Why this SDK

Same Billing API as Node — create subscriptions, one-time payments, and shareable payment links; verify webhooks. Non-custodial USDC on Base settles to your merchant `payoutAddressEvm`. API keys and webhook secrets stay on the server.

## Install

```bash
pip install autlantic-billing
```

Requires **Python 3.10+**. Local editable: `pip install -e ".[dev]"` from this folder.

## Quick start

```python
from autlantic_billing import AutlanticBilling

billing = AutlanticBilling.from_env()  # AUTLANTIC_BILLING_API_KEY required

link = billing.create_payment_link({
    "amountUsdc": 42,
    "merchantRefPrefix": "invoice",
    "description": "Consulting",
    "successUrl": "myapp://billing/success",
    "cancelUrl": "myapp://billing/cancel",
})
# Share link["url"] or open it with a mobile Checkout SDK
```

## Webhooks

Verify `x-autlantic-signature` with your portal endpoint secret:

```python
from autlantic_billing import verify_billing_webhook, parse_billing_webhook_event

def handle(raw_body: str, signature: str | None, secret: str):
    if not verify_billing_webhook(secret, raw_body, signature):
        raise ValueError("bad signature")
    event = parse_billing_webhook_event(raw_body)
    # Unlock on invoice.paid / payment.paid / subscription.activated
```

## Environment

| Env var | Purpose |
|---------|---------|
| `AUTLANTIC_BILLING_API_KEY` | `abk_test_…` or `abk_live_…` (required) |
| `AUTLANTIC_BILLING_API_URL` | Default `https://billing.autlantic.com` |
| `AUTLANTIC_BILLING_MERCHANT_ID` | Optional merchant id |

Hosted mode only. Pins `Autlantic-Version: 2026-01-01`.

## Documentation

| | |
|--|--|
| [Python SDK](https://docs.autlantic.com/api/python) | API reference |
| [Languages](https://docs.autlantic.com/guide/languages) | All SDK surfaces |
| [Mobile apps](https://docs.autlantic.com/guide/mobile) | Checkout presenters |
| [Webhooks](https://docs.autlantic.com/guide/webhooks) | Signature & events |
| [Terms](https://autlantic.com/terms) · [Privacy](https://autlantic.com/privacy) · [Security](https://autlantic.com/security) | Legal |

## Develop

```bash
pip install -e ".[dev]"
pytest
```

## License

MIT · Operated by **Autlantic Limited** (UK company no. 17422039).

Part of [Autlantic Payments SDK](https://github.com/Autlantic/payments-sdk).
