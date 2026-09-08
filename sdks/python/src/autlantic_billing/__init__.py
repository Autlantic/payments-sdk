"""Official Autlantic Billing server client (hosted API)."""

from __future__ import annotations

from .client import AutlanticBilling, AutlanticBillingError
from .version import AUTLANTIC_API_VERSION, SDK_VERSION
from .webhook import (
    BILLING_WEBHOOK_SIGNATURE_HEADER,
    BILLING_WEBHOOK_TOLERANCE_SEC,
    parse_billing_webhook_event,
    verify_billing_webhook,
    verify_billing_webhook_detailed,
)

__all__ = [
    "AUTLANTIC_API_VERSION",
    "SDK_VERSION",
    "AutlanticBilling",
    "AutlanticBillingError",
    "BILLING_WEBHOOK_SIGNATURE_HEADER",
    "BILLING_WEBHOOK_TOLERANCE_SEC",
    "parse_billing_webhook_event",
    "verify_billing_webhook",
    "verify_billing_webhook_detailed",
]
