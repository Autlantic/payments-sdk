# Python SDK

Official **server** client for the hosted Billing API. Lives in the payments-sdk repo at `sdks/python`.

```bash
cd sdks/python && pip install -e .
# when published: pip install autlantic-billing
```

```python
from autlantic_billing import AutlanticBilling, verify_billing_webhook

billing = AutlanticBilling.from_env()
link = billing.create_payment_link({
    "amountUsdc": 42,
    "merchantRefPrefix": "invoice",
    "successUrl": "myapp://billing/success",
})
```

Pins `Autlantic-Version: 2026-01-01`. Hosted mode only. See [Languages](/guide/languages) and [API versioning](/guide/api-versioning).

## Related

- [Go SDK](/api/go)
- [Node.js SDK](/api/nodejs)
- [Mobile apps](/guide/mobile)
