# Python SDK

Official **server** client for the hosted Billing API.

```bash
pip install autlantic-billing
```

PyPI: [autlantic-billing](https://pypi.org/project/autlantic-billing/) · source: `sdks/python` in [payments-sdk](https://github.com/Autlantic/payments-sdk)

## Quick start

```python
from autlantic_billing import AutlanticBilling, verify_billing_webhook

billing = AutlanticBilling.from_env()  # AUTLANTIC_BILLING_API_KEY required

link = billing.create_payment_link({
    "amountUsdc": 42,
    "merchantRefPrefix": "invoice",
    "description": "Consulting",
    "successUrl": "myapp://billing/success",
    "cancelUrl": "myapp://billing/cancel",
})
# Share link["url"] or open it with the mobile Checkout SDK
```

## Environment

| Env var | Purpose |
|---------|---------|
| `AUTLANTIC_BILLING_API_KEY` | `abk_test_…` or `abk_live_…` (required) |
| `AUTLANTIC_BILLING_API_URL` | Default `https://billing.autlantic.com` |
| `AUTLANTIC_BILLING_MERCHANT_ID` | Optional merchant id |

Hosted mode only (no in-process sandbox). Pins `Autlantic-Version: 2026-01-01`. Sends `Idempotency-Key` on POSTs and retries on 429/5xx.

## Client methods

| Method | Description |
|--------|-------------|
| `list_products()` | Catalog products and prices |
| `create_subscription(body)` | Incomplete subscription + `checkoutUrl` |
| `get_subscription(id)` | Fetch subscription |
| `activate_subscription(id)` | Activate |
| `cancel_subscription(id, body?)` | Cancel |
| `create_payment(body)` | One-time payment + `checkoutUrl` |
| `get_payment(id)` | Fetch payment |
| `create_payment_link(body)` | Shareable link + `url` |
| `list_payment_links()` | List links |
| `get_payment_link(id)` | Fetch link |
| `disable_payment_link(id)` | Disable link |
| `list_invoices(subscription_id?)` | List invoices |

`successUrl` / `cancelUrl` are supported on create subscription, payment, and payment link (app deep links).

## Webhooks

```python
from autlantic_billing import (
    verify_billing_webhook,
    parse_billing_webhook_event,
)

def handle(raw_body: str, signature: str | None, secret: str):
    if not verify_billing_webhook(secret, raw_body, signature):
        raise ValueError("bad signature")
    event = parse_billing_webhook_event(raw_body)
    # Unlock on invoice.paid / payment.paid / subscription.activated
```

Header: `x-autlantic-signature`. Same rules as [Webhooks](/guide/webhooks).

## Errors

`AutlanticBillingError` exposes `message`, `code`, `status_code`, `request_id`, and `body`.

## Related

- [Go SDK](/api/go)
- [Node.js SDK](/api/nodejs)
- [Mobile apps](/guide/mobile)
- [API versioning](/guide/api-versioning)
- [Languages and SDKs](/guide/languages)
