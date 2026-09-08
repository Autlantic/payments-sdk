"""Webhook signature helpers matching @autlantic/payments-recurring."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any

BILLING_WEBHOOK_SIGNATURE_HEADER = "x-autlantic-signature"
BILLING_WEBHOOK_TOLERANCE_SEC = 300


def _hmac_hex(secret: str, payload: str) -> str:
    return hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def _safe_equal_hex(a: str, b: str) -> bool:
    try:
        return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))
    except Exception:
        return False


def sign_billing_webhook_body(
    secret: str,
    raw_body: str,
    timestamp_sec: int | None = None,
) -> str:
    """Emit Stripe-style `t=<unix>,v1=<hmac>`."""
    t = str(int(time.time() if timestamp_sec is None else timestamp_sec))
    v1 = _hmac_hex(secret, f"{t}.{raw_body}")
    return f"t={t},v1={v1}"


def verify_billing_webhook_detailed(
    secret: str,
    raw_body: str,
    signature_header: str | None,
    *,
    tolerance_sec: int = BILLING_WEBHOOK_TOLERANCE_SEC,
    now_sec: int | None = None,
) -> dict[str, Any]:
    if not secret.strip():
        return {"ok": False, "reason": "empty_secret"}
    if not signature_header or not signature_header.strip():
        return {"ok": False, "reason": "missing_header"}

    header = signature_header.strip()
    now = int(time.time() if now_sec is None else now_sec)

    if "t=" in header and "v1=" in header:
        parts: dict[str, str] = {}
        for piece in header.split(","):
            if "=" not in piece:
                continue
            k, v = piece.split("=", 1)
            parts[k] = v
        try:
            t = int(parts.get("t", ""))
        except ValueError:
            return {"ok": False, "reason": "timestamp_invalid"}
        v1 = (parts.get("v1") or "").strip()
        if not v1:
            return {"ok": False, "reason": "timestamp_invalid"}
        if abs(now - t) > tolerance_sec:
            return {"ok": False, "reason": "timestamp_expired"}
        expected = _hmac_hex(secret, f"{t}.{raw_body}")
        if not _safe_equal_hex(expected, v1):
            return {"ok": False, "reason": "invalid_signature"}
        return {"ok": True}

    expected = _hmac_hex(secret, raw_body)
    if len(expected) != len(header):
        return {"ok": False, "reason": "length_mismatch"}
    if not _safe_equal_hex(expected, header):
        return {"ok": False, "reason": "invalid_signature"}
    return {"ok": True}


def verify_billing_webhook(
    secret: str,
    raw_body: str,
    signature_header: str | None,
    *,
    tolerance_sec: int = BILLING_WEBHOOK_TOLERANCE_SEC,
    now_sec: int | None = None,
) -> bool:
    return verify_billing_webhook_detailed(
        secret,
        raw_body,
        signature_header,
        tolerance_sec=tolerance_sec,
        now_sec=now_sec,
    )["ok"] is True


def parse_billing_webhook_event(raw_body: str) -> dict[str, Any] | None:
    try:
        data = json.loads(raw_body)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    if "type" not in data or "data" not in data:
        return None
    return data
