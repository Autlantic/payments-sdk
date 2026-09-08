from autlantic_billing import AutlanticBilling, AutlanticBillingError, AUTLANTIC_API_VERSION
from autlantic_billing.client import billing_mode_from_api_key


def test_api_version_pin():
    assert AUTLANTIC_API_VERSION == "2026-01-01"


def test_mode_from_key():
    assert billing_mode_from_api_key("abk_test_x") == "test"
    assert billing_mode_from_api_key("abk_live_x") == "live"


def test_from_env_requires_key():
    try:
        AutlanticBilling.from_env({})
        assert False, "expected error"
    except AutlanticBillingError as exc:
        assert exc.code == "configuration"
