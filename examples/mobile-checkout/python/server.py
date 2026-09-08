#!/usr/bin/env python3
"""Hosted-mode merchant backend sample for Autlantic mobile Checkout (Python SDK).

Requires:
  pip install -e ../../sdks/python
  AUTLANTIC_BILLING_API_KEY=abk_test_…
  AUTLANTIC_BILLING_API_URL=https://billing.autlantic.com
  AUTLANTIC_BILLING_MERCHANT_ID=mer_…
  AUTLANTIC_BILLING_WEBHOOK_SECRET=whsec_…
  AUTLANTIC_PAYOUT_ADDRESS_EVM=0x…

Run: python server.py
"""

from __future__ import annotations

import json
import os
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any
from urllib.parse import unquote

from autlantic_billing import (
    AutlanticBilling,
    parse_billing_webhook_event,
    verify_billing_webhook_detailed,
)

PORT = int(os.environ.get("PORT", "3056"))
RETURN_SCHEME = os.environ.get("MOBILE_RETURN_SCHEME", "myapp").rstrip(":/")
SUCCESS_URL = os.environ.get("MOBILE_SUCCESS_URL", f"{RETURN_SCHEME}://billing/success")
CANCEL_URL = os.environ.get("MOBILE_CANCEL_URL", f"{RETURN_SCHEME}://billing/cancel")
PAYOUT = (
    os.environ.get("AUTLANTIC_PAYOUT_ADDRESS_EVM", "").strip()
    or "0x1111111111111111111111111111111111111111"
)
WEBHOOK_SECRET = os.environ.get("AUTLANTIC_BILLING_WEBHOOK_SECRET", "").strip() or "whsec_mobile_example"

access_by_ref: dict[str, dict[str, Any]] = {}


def billing_client() -> AutlanticBilling:
    return AutlanticBilling.from_env()


class Handler(BaseHTTPRequestHandler):
    def _json(self, status: int, body: Any) -> None:
        raw = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _read(self) -> str:
        length = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(length).decode("utf-8") if length else ""

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._json(
                200,
                {
                    "ok": True,
                    "mode": "hosted",
                    "sdk": "python",
                    "successUrl": SUCCESS_URL,
                    "cancelUrl": CANCEL_URL,
                },
            )
            return
        if self.path.startswith("/api/access/"):
            merchant_ref = unquote(self.path[len("/api/access/") :])
            row = access_by_ref.get(merchant_ref)
            if not row:
                self._json(404, {"error": "Unknown merchantRef"})
                return
            self._json(200, {"merchantRef": merchant_ref, **row})
            return
        self._json(404, {"error": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/api/checkout":
            body = json.loads(self._read() or "{}")
            amount = float(body.get("amountUsdc") or 20)
            merchant_ref = (body.get("merchantRef") or "").strip() or f"mobile_{int(time.time() * 1000)}"
            access_by_ref[merchant_ref] = {
                "active": False,
                "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "kind": "payment_link",
            }
            created = billing_client().create_payment_link(
                {
                    "merchantRefPrefix": merchant_ref,
                    "payoutAddressEvm": PAYOUT,
                    "amountUsdc": amount,
                    "description": "Mobile checkout demo (Python)",
                    "maxUses": 1,
                    "successUrl": SUCCESS_URL,
                    "cancelUrl": CANCEL_URL,
                }
            )
            self._json(
                201,
                {
                    "kind": "payment_link",
                    "merchantRef": merchant_ref,
                    "checkoutUrl": created.get("url"),
                    "paymentLinkId": (created.get("paymentLink") or {}).get("id"),
                    "successUrl": SUCCESS_URL,
                    "cancelUrl": CANCEL_URL,
                },
            )
            return

        if self.path == "/webhooks/autlantic":
            raw = self._read()
            signature = self.headers.get("x-autlantic-signature")
            verified = verify_billing_webhook_detailed(WEBHOOK_SECRET, raw, signature)
            if not verified.get("ok"):
                self._json(400, {"error": "bad signature", "reason": verified.get("reason")})
                return
            event = parse_billing_webhook_event(raw)
            if not event:
                self._json(400, {"error": "bad body"})
                return
            data = event.get("data") or {}
            merchant_ref = data.get("merchantRef") or data.get("merchant_ref")
            event_type = event.get("type")
            if merchant_ref and event_type in (
                "invoice.paid",
                "payment.paid",
                "subscription.activated",
            ):
                access_by_ref[str(merchant_ref)] = {
                    "active": True,
                    "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "kind": event_type,
                }
            self._json(200, {"received": True, "type": event_type})
            return

        self._json(404, {"error": "Not found"})

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"[python-mobile] {self.address_string()} - {fmt % args}")


if __name__ == "__main__":
    if not os.environ.get("AUTLANTIC_BILLING_API_KEY", "").strip():
        raise SystemExit("Set AUTLANTIC_BILLING_API_KEY (and related hosted env) before starting")
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"[python-mobile-checkout] http://localhost:{PORT}")
    print("  POST /api/checkout")
    print("  GET  /api/access/:merchantRef")
    print("  POST /webhooks/autlantic")
    server.serve_forever()
