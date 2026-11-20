#!/usr/bin/env python3
"""Hosted E2E: createPayment → sandbox confirm → refundPayment (+ Connect if platform).

Usage:
  set -a && source /path/to/billing-e2e.env && set +a
  python3 sdks/bin/e2e-hosted-refund-connect.py
"""

from __future__ import annotations

import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "python", "src"))
sys.path.insert(0, ROOT)

from autlantic_billing import AutlanticBilling, AutlanticBillingError  # noqa: E402

UA = "autlantic-sdk-e2e/0.1.1"


def http_json(method: str, url: str, body: dict | None = None, headers: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Accept": "application/json",
            "User-Agent": UA,
            **({"Content-Type": "application/json"} if body is not None else {}),
            **(headers or {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            raw = res.read().decode() or "{}"
            return res.status, json.loads(raw)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode() if exc.fp else ""
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw}
        return exc.code, parsed


def main() -> int:
    api_key = (os.environ.get("AUTLANTIC_BILLING_API_KEY") or "").strip()
    api_url = (
        os.environ.get("AUTLANTIC_BILLING_API_URL") or "https://billing.autlantic.com"
    ).rstrip("/")
    if not api_key.startswith("abk_"):
        print("FAIL: set AUTLANTIC_BILLING_API_KEY")
        return 1

    billing = AutlanticBilling(api_key=api_key, api_base_url=api_url)
    print(f"PASS python client mode={billing.mode} url={api_url}")

    connect = "skipped"
    try:
        page = billing.list_connected_merchants(limit=1)
        print(f"PASS connect list keys={list(page.keys())[:6]}")
        ref = f"sdk_e2e_{int(time.time())}_{secrets.token_hex(2)}"
        prov = billing.provision_connected_merchant(
            {
                "displayName": "SDK E2E Connected",
                "externalStoreRef": ref,
                "payoutAddressEvm": "0x00000000000000000000000000000000000000e2",
            }
        )
        mid = (prov.get("merchant") or {}).get("id") or prov.get("id")
        print(f"PASS connect provision id={mid}")
        if mid:
            billing.get_connected_merchant(str(mid))
            print("PASS connect get")
            billing.disable_connected_merchant(str(mid), {"revokeApiKeys": True})
            print("PASS connect disable")
        connect = "ok"
    except AutlanticBillingError as exc:
        connect = f"blocked:{exc.status_code}:{exc.message}"
        print(f"CONNECT {connect}")

    created = billing.create_payment(
        {
            "merchantRef": f"sdk_py_e2e_{int(time.time())}",
            "customerWallet": "0x0000000000000000000000000000000000000001",
            "amountUsdc": 1,
            "successUrl": "https://example.com/ok",
            "cancelUrl": "https://example.com/cancel",
            "metadata": {"sdk_e2e": "python"},
        }
    )
    payment = created.get("payment") or created
    pid = str(payment["id"])
    print(f"PASS create_payment {pid}")

    code, status = http_json("GET", f"{api_url}/checkout/pay/{pid}/status")
    if code >= 400:
        print(f"FAIL checkout status http={code} body={status}")
        return 1
    token = str(status.get("actionToken") or "")
    if not token:
        print(f"FAIL missing actionToken {status}")
        return 1

    code, confirm = http_json(
        "POST",
        f"{api_url}/checkout/pay/{pid}/confirm",
        {"actionToken": token},
    )
    pst = (confirm.get("payment") or {}).get("status") or (
        "paid" if confirm.get("paid") else None
    )
    if code >= 400 or pst != "paid":
        print(f"FAIL sandbox confirm http={code} body={confirm}")
        return 1
    print("PASS sandbox confirm paid")

    refunded = billing.refund_payment(pid, {"reason": "sdk_e2e_python"})
    rst = (refunded.get("payment") or refunded).get("status")
    if rst != "refunded":
        print(f"FAIL refund status={rst} body={refunded}")
        return 1
    print("PASS refund_payment => refunded")

    got = billing.get_payment(pid)
    gst = (got.get("payment") or got).get("status")
    if gst != "refunded":
        print(f"FAIL get_payment status={gst}")
        return 1
    print(f"PASS get_payment {gst}")
    print(f"PYTHON_E2E_OK connect={connect}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
