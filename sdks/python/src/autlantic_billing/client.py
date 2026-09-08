"""Hosted Autlantic Billing HTTP client."""

from __future__ import annotations

import json
import os
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from .version import AUTLANTIC_API_VERSION, SDK_VERSION, USER_AGENT

_RETRYABLE_STATUS = {408, 429, 500, 502, 503, 504}
_MAX_ATTEMPTS = 3


class AutlanticBillingError(Exception):
    def __init__(
        self,
        message: str,
        *,
        code: str | None = None,
        status_code: int | None = None,
        request_id: str | None = None,
        body: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.request_id = request_id
        self.body = body


def billing_mode_from_api_key(api_key: str | None) -> str:
    key = (api_key or "").strip()
    if "_live_" in key:
        return "live"
    return "test"


class AutlanticBilling:
    """Merchant server client for `https://billing.autlantic.com` (hosted only)."""

    def __init__(
        self,
        *,
        api_key: str,
        api_base_url: str = "https://billing.autlantic.com",
        merchant_id: str | None = None,
        timeout_sec: float = 30.0,
        max_retries: int = _MAX_ATTEMPTS - 1,
    ) -> None:
        if not api_key.strip():
            raise AutlanticBillingError("api_key is required", code="configuration")
        self.api_key = api_key.strip()
        self.api_base_url = api_base_url.rstrip("/")
        self.merchant_id = merchant_id
        self.timeout_sec = timeout_sec
        self.max_retries = max(0, max_retries)
        self.mode = billing_mode_from_api_key(self.api_key)

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> AutlanticBilling:
        e = env if env is not None else os.environ
        api_key = (e.get("AUTLANTIC_BILLING_API_KEY") or "").strip()
        if not api_key:
            raise AutlanticBillingError(
                "AUTLANTIC_BILLING_API_KEY is required",
                code="configuration",
            )
        return cls(
            api_key=api_key,
            api_base_url=(e.get("AUTLANTIC_BILLING_API_URL") or "https://billing.autlantic.com").strip(),
            merchant_id=(e.get("AUTLANTIC_BILLING_MERCHANT_ID") or None),
        )

    def list_products(self) -> dict[str, Any]:
        return self._request("GET", "/v1/products")

    def create_subscription(self, body: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/v1/subscriptions", body=body)

    def get_subscription(self, subscription_id: str) -> dict[str, Any]:
        return self._request("GET", f"/v1/subscriptions/{urllib.parse.quote(subscription_id)}")

    def activate_subscription(self, subscription_id: str) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/v1/subscriptions/{urllib.parse.quote(subscription_id)}/activate",
            body={},
        )

    def cancel_subscription(
        self, subscription_id: str, body: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/v1/subscriptions/{urllib.parse.quote(subscription_id)}/cancel",
            body=body or {},
        )

    def create_payment(self, body: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/v1/payments", body=body)

    def get_payment(self, payment_id: str) -> dict[str, Any]:
        return self._request("GET", f"/v1/payments/{urllib.parse.quote(payment_id)}")

    def create_payment_link(self, body: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/v1/payment-links", body=body)

    def list_payment_links(self) -> dict[str, Any]:
        return self._request("GET", "/v1/payment-links")

    def get_payment_link(self, link_id: str) -> dict[str, Any]:
        return self._request("GET", f"/v1/payment-links/{urllib.parse.quote(link_id)}")

    def disable_payment_link(self, link_id: str) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/v1/payment-links/{urllib.parse.quote(link_id)}/disable",
            body={},
        )

    def list_invoices(self, *, subscription_id: str | None = None) -> dict[str, Any]:
        path = "/v1/invoices"
        if subscription_id:
            path += f"?subscriptionId={urllib.parse.quote(subscription_id)}"
        return self._request("GET", path)

    def _request(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, Any] | None = None,
        idempotent: bool = True,
    ) -> dict[str, Any]:
        request_id = f"req_{int(time.time() * 1000):x}_{secrets.token_hex(4)}"
        url = f"{self.api_base_url}{path}"
        encoded = None if body is None else json.dumps(body).encode("utf-8")
        idem_key = None
        if method == "POST" and idempotent:
            idem_key = f"sdk_{int(time.time() * 1000)}_{secrets.token_hex(4)}"

        attempts = self.max_retries + 1
        last_error: Exception | None = None
        for attempt in range(attempts):
            headers = {
                "Accept": "application/json",
                "User-Agent": USER_AGENT,
                "X-Autlantic-Api-Key": self.api_key,
                "X-Autlantic-Sdk-Version": SDK_VERSION,
                "X-Autlantic-Client-Request-Id": request_id,
                "Autlantic-Version": AUTLANTIC_API_VERSION,
            }
            if body is not None:
                headers["Content-Type"] = "application/json"
            if idem_key:
                headers["Idempotency-Key"] = idem_key

            req = urllib.request.Request(url, data=encoded, headers=headers, method=method)
            try:
                with urllib.request.urlopen(req, timeout=self.timeout_sec) as res:
                    raw = res.read().decode("utf-8")
                    payload = json.loads(raw) if raw else {}
                    if not isinstance(payload, dict):
                        raise AutlanticBillingError(
                            "Unexpected response shape",
                            status_code=getattr(res, "status", None),
                            request_id=request_id,
                            body=payload,
                        )
                    return payload
            except urllib.error.HTTPError as exc:
                raw = exc.read().decode("utf-8") if exc.fp else ""
                try:
                    err_body = json.loads(raw) if raw else {}
                except json.JSONDecodeError:
                    err_body = {"error": raw or exc.reason}
                message = (
                    err_body.get("error") if isinstance(err_body, dict) else None
                ) or str(exc.reason)
                code = err_body.get("code") if isinstance(err_body, dict) else None
                err = AutlanticBillingError(
                    str(message),
                    code=code if isinstance(code, str) else None,
                    status_code=exc.code,
                    request_id=request_id,
                    body=err_body,
                )
                last_error = err
                if exc.code in _RETRYABLE_STATUS and attempt + 1 < attempts:
                    time.sleep(0.25 * (2**attempt))
                    continue
                raise err from exc
            except urllib.error.URLError as exc:
                err = AutlanticBillingError(
                    f"Network error: {exc.reason}",
                    code="network_error",
                    request_id=request_id,
                )
                last_error = err
                if attempt + 1 < attempts:
                    time.sleep(0.25 * (2**attempt))
                    continue
                raise err from exc

        assert last_error is not None
        raise last_error
