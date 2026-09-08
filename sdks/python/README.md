# Python SDK (server)

Official Autlantic Billing HTTP client for Python backends.

## Install (local)

```bash
cd sdks/python
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"  # or: pip install -e . pytest
pytest
```

## Usage

```python
from autlantic_billing import AutlanticBilling, verify_billing_webhook

billing = AutlanticBilling.from_env()

result = billing.create_payment_link({
    "amountUsdc": 42,
    "merchantRefPrefix": "invoice",
    "successUrl": "myapp://billing/success",
    "cancelUrl": "myapp://billing/cancel",
})
url = result.get("url")
```

Webhook handler:

```python
from autlantic_billing import verify_billing_webhook, parse_billing_webhook_event

def handle(raw_body: str, signature: str | None, secret: str):
    if not verify_billing_webhook(secret, raw_body, signature):
        raise ValueError("bad signature")
    event = parse_billing_webhook_event(raw_body)
    # unlock access on invoice.paid / payment.paid / subscription.activated
```

## Notes

- Hosted API only. Pins `Autlantic-Version: 2026-01-01`.
- Not on PyPI until the first publish (`autlantic-billing`).
- Secrets stay on the server. Mobile apps use Checkout SDKs, not this package.
