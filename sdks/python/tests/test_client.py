from autlantic_billing import (
    AutlanticBilling,
    AutlanticBillingError,
    AUTLANTIC_API_VERSION,
    SDK_VERSION,
)
from autlantic_billing.client import billing_mode_from_api_key


def test_api_version_pin():
    assert AUTLANTIC_API_VERSION == "2026-01-01"
    assert SDK_VERSION == "0.1.1"


def test_parity_surface():
    client = AutlanticBilling(api_key="abk_test_demo")
    for name in (
        "get_invoice",
        "refund_invoice",
        "refund_payment",
        "void_invoice",
        "provision_connected_merchant",
        "list_connected_merchants",
        "get_connected_merchant",
        "update_connected_merchant",
        "disable_connected_merchant",
        "create_connected_api_key",
        "list_connected_webhook_endpoints",
        "create_connected_webhook_endpoint",
    ):
        assert hasattr(client, name), name


def test_mode_from_key():
    assert billing_mode_from_api_key("abk_test_x") == "test"
    assert billing_mode_from_api_key("abk_live_x") == "live"


def test_from_env_requires_key():
    try:
        AutlanticBilling.from_env({})
        assert False, "expected error"
    except AutlanticBillingError as exc:
        assert exc.code == "configuration"
