#!/usr/bin/env python3
"""Hosted E2E: trial multi-merchant isolation (Test mode).

Requires two distinct abk_test_* keys (different merchants):
  AUTLANTIC_BILLING_API_KEY          # merchant A
  AUTLANTIC_BILLING_API_KEY_B        # merchant B
  AUTLANTIC_BILLING_API_URL          # default https://billing.autlantic.com

Usage:
  set -a && source /path/to/a.env && set +a
  export AUTLANTIC_BILLING_API_KEY_B=abk_test_…
  python3 sdks/bin/e2e-trials-multi-merchant.py
"""

from __future__ import annotations

import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

UA = "autlantic-trials-isolation-e2e/0.1.0"
PAYOUT = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
WALLET = "0x0000000000000000000000000000000000000001"


def http_json(
    method: str,
    url: str,
    *,
    api_key: str,
    body: dict | None = None,
) -> tuple[int, dict]:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Accept": "application/json",
            "User-Agent": UA,
            "Authorization": f"Bearer {api_key}",
            "X-Autlantic-Api-Key": api_key,
            "Autlantic-Version": "2026-01-01",
            **({"Content-Type": "application/json"} if body is not None else {}),
            **(
                {
                    "Idempotency-Key": f"e2e_{int(time.time() * 1000)}_{secrets.token_hex(3)}"
                }
                if method == "POST"
                else {}
            ),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as res:
            raw = res.read().decode() or "{}"
            return res.status, json.loads(raw)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode() if exc.fp else ""
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw}
        return exc.code, parsed


def sub_payload(label: str, trial_days: int = 7) -> dict:
    return {
        "merchantRef": f"trial_iso_{label}_{int(time.time())}_{secrets.token_hex(2)}",
        "customerWallet": WALLET,
        "payoutAddressEvm": PAYOUT,
        "amountUsdc": 5,
        "interval": "month",
        "trialDays": trial_days,
        "successUrl": "https://example.com/ok",
        "cancelUrl": "https://example.com/cancel",
        "metadata": {"e2e": "trials_multi_merchant", "merchant": label},
    }


def unwrap_sub(body: dict) -> dict:
    return body.get("subscription") or body


def unwrap_inv(body: dict) -> dict | None:
    inv = body.get("invoice")
    return inv if isinstance(inv, dict) else None


def main() -> int:
    key_a = (os.environ.get("AUTLANTIC_BILLING_API_KEY") or "").strip()
    key_b = (os.environ.get("AUTLANTIC_BILLING_API_KEY_B") or "").strip()
    api_url = (
        os.environ.get("AUTLANTIC_BILLING_API_URL") or "https://billing.autlantic.com"
    ).rstrip("/")

    if not key_a.startswith("abk_test_") or not key_b.startswith("abk_test_"):
        print("FAIL: need AUTLANTIC_BILLING_API_KEY and AUTLANTIC_BILLING_API_KEY_B (abk_test_*)")
        return 1
    if key_a == key_b:
        print("FAIL: A and B keys must be different merchants")
        return 1

    print(f"PASS keys distinct url={api_url}")

    # --- create trial subs on A and B ---
    code, created_a = http_json(
        "POST", f"{api_url}/v1/subscriptions", api_key=key_a, body=sub_payload("a")
    )
    if code >= 400:
        print(f"FAIL create A http={code} body={created_a}")
        return 1
    sub_a = unwrap_sub(created_a)
    inv_a = unwrap_inv(created_a)
    sid_a = str(sub_a["id"])
    if sub_a.get("status") != "trialing":
        print(f"FAIL A status want trialing got={sub_a.get('status')} body={created_a}")
        return 1
    due_a = (inv_a or {}).get("dueAt")
    print(f"PASS A create {sid_a} status=trialing dueAt={due_a}")

    code, created_b = http_json(
        "POST", f"{api_url}/v1/subscriptions", api_key=key_b, body=sub_payload("b")
    )
    if code >= 400:
        print(f"FAIL create B http={code} body={created_b}")
        return 1
    sub_b = unwrap_sub(created_b)
    inv_b = unwrap_inv(created_b)
    sid_b = str(sub_b["id"])
    if sub_b.get("status") != "trialing":
        print(f"FAIL B status want trialing got={sub_b.get('status')}")
        return 1
    due_b_before = (inv_b or {}).get("dueAt")
    print(f"PASS B create {sid_b} status=trialing dueAt={due_b_before}")

    # --- cross-tenant GET must not return peer row ---
    code, peek = http_json("GET", f"{api_url}/v1/subscriptions/{sid_a}", api_key=key_b)
    if code < 400:
        # Some APIs 200 with empty; reject any successful body that exposes A
        peeked = unwrap_sub(peek) if isinstance(peek, dict) else {}
        if peeked.get("id") == sid_a:
            print(f"FAIL B can read A subscription http={code}")
            return 1
    print(f"PASS B cannot read A (http={code})")

    code, peek = http_json("GET", f"{api_url}/v1/subscriptions/{sid_b}", api_key=key_a)
    if code < 400:
        peeked = unwrap_sub(peek) if isinstance(peek, dict) else {}
        if peeked.get("id") == sid_b:
            print(f"FAIL A can read B subscription http={code}")
            return 1
    print(f"PASS A cannot read B (http={code})")

    # --- B cannot activate / cancel A ---
    code, act = http_json(
        "POST",
        f"{api_url}/v1/subscriptions/{sid_a}/activate",
        api_key=key_b,
        body={"onChainSubscriptionId": "1"},
    )
    if code < 400 and unwrap_sub(act).get("id") == sid_a:
        print(f"FAIL B activated A http={code}")
        return 1
    print(f"PASS B cannot activate A (http={code})")

    code, can = http_json(
        "POST",
        f"{api_url}/v1/subscriptions/{sid_a}/cancel",
        api_key=key_b,
        body={"immediate": True},
    )
    if code < 400 and unwrap_sub(can).get("status") in ("canceled", "cancelled"):
        # confirm A still trialing under A key
        _, still = http_json("GET", f"{api_url}/v1/subscriptions/{sid_a}", api_key=key_a)
        if unwrap_sub(still).get("status") == "canceled":
            print("FAIL B canceled A")
            return 1
    print(f"PASS B cannot cancel A (http={code})")

    # --- A test clock advance must not rewrite B dueAt ---
    far = (datetime.now(timezone.utc) + timedelta(days=30)).strftime(
        "%Y-%m-%dT%H:%M:%S.000Z"
    )
    code, clock = http_json(
        "POST",
        f"{api_url}/v1/test_clock",
        api_key=key_a,
        body={"frozenAt": far},
    )
    if code >= 400:
        print(f"FAIL A set test_clock http={code} body={clock}")
        return 1
    print(f"PASS A test_clock frozenAt={clock.get('frozenAt')}")

    code, got_b = http_json("GET", f"{api_url}/v1/subscriptions/{sid_b}", api_key=key_b)
    if code >= 400:
        print(f"FAIL get B after A clock http={code}")
        return 1
    # Refresh invoice list for B
    code, invs_b = http_json(
        "GET",
        f"{api_url}/v1/invoices?subscriptionId={sid_b}",
        api_key=key_b,
    )
    due_b_after = due_b_before
    if code < 400:
        items = invs_b.get("invoices") or invs_b.get("data") or []
        if isinstance(items, list) and items:
            due_b_after = items[0].get("dueAt") or due_b_after
    if due_b_before and due_b_after and due_b_before != due_b_after:
        # dueAt string compare: clock must not mutate B
        print(f"FAIL B dueAt changed after A clock before={due_b_before} after={due_b_after}")
        return 1
    print(f"PASS B dueAt unchanged after A clock ({due_b_after})")

    # B clock should be independent
    code, clock_b = http_json("GET", f"{api_url}/v1/test_clock", api_key=key_b)
    if code >= 400:
        print(f"FAIL get B test_clock http={code}")
        return 1
    frozen_b = clock_b.get("frozenAt")
    if frozen_b and frozen_b == clock.get("frozenAt"):
        print(f"FAIL B clock leaked A's frozenAt={frozen_b}")
        return 1
    print(f"PASS B test_clock independent frozenAt={frozen_b}")

    # --- A activate mandate-only: stay trialing ---
    code, activated = http_json(
        "POST",
        f"{api_url}/v1/subscriptions/{sid_a}/activate",
        api_key=key_a,
        body={"onChainSubscriptionId": "1"},
    )
    if code >= 400:
        print(f"FAIL A activate http={code} body={activated}")
        return 1
    st = unwrap_sub(activated).get("status") or activated.get("subscription", {}).get(
        "status"
    )
    # activate response may nest under subscription
    if st is None and isinstance(activated.get("subscription"), dict):
        st = activated["subscription"].get("status")
    if st != "trialing":
        # some responses put status at top
        st = activated.get("status") or st
    # After mandate-only trial activate, subscription must remain trialing
    code, got_a = http_json("GET", f"{api_url}/v1/subscriptions/{sid_a}", api_key=key_a)
    st = unwrap_sub(got_a).get("status")
    if st != "trialing":
        print(f"FAIL A after activate want trialing got={st} activate={activated}")
        return 1
    print("PASS A activate mandate-only stays trialing")

    # B still untouched
    code, got_b = http_json("GET", f"{api_url}/v1/subscriptions/{sid_b}", api_key=key_b)
    if unwrap_sub(got_b).get("status") != "trialing":
        print(f"FAIL B status drifted to {unwrap_sub(got_b).get('status')}")
        return 1
    print("PASS B still trialing after A activate")

    # --- A cancel-in-trial; B untouched ---
    code, canceled = http_json(
        "POST",
        f"{api_url}/v1/subscriptions/{sid_a}/cancel",
        api_key=key_a,
        body={"immediate": True},
    )
    if code >= 400:
        print(f"FAIL A cancel http={code} body={canceled}")
        return 1
    code, got_a = http_json("GET", f"{api_url}/v1/subscriptions/{sid_a}", api_key=key_a)
    if unwrap_sub(got_a).get("status") not in ("canceled", "cancelled"):
        print(f"FAIL A cancel status={unwrap_sub(got_a).get('status')}")
        return 1
    code, got_b = http_json("GET", f"{api_url}/v1/subscriptions/{sid_b}", api_key=key_b)
    if unwrap_sub(got_b).get("status") != "trialing":
        print(f"FAIL B affected by A cancel status={unwrap_sub(got_b).get('status')}")
        return 1
    print("PASS A cancel-in-trial; B still trialing")

    # cleanup B
    http_json(
        "POST",
        f"{api_url}/v1/subscriptions/{sid_b}/cancel",
        api_key=key_b,
        body={"immediate": True},
    )
    # clear A clock
    http_json(
        "POST",
        f"{api_url}/v1/test_clock",
        api_key=key_a,
        body={"frozenAt": None},
    )

    print("ENTERPRISE_PROVEN_TRIALS_MULTI_MERCHANT_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
