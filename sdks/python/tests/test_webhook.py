from autlantic_billing.webhook import (
    parse_billing_webhook_event,
    sign_billing_webhook_body,
    verify_billing_webhook,
    verify_billing_webhook_detailed,
)


def test_sign_and_verify_timestamped():
    body = '{"type":"invoice.paid","data":{}}'
    sig = sign_billing_webhook_body("whsec_test", body, timestamp_sec=1_700_000_000)
    assert verify_billing_webhook(
        "whsec_test",
        body,
        sig,
        now_sec=1_700_000_000,
    )


def test_rejects_expired():
    body = '{"type":"invoice.paid","data":{}}'
    sig = sign_billing_webhook_body("whsec_test", body, timestamp_sec=1_700_000_000)
    result = verify_billing_webhook_detailed(
        "whsec_test",
        body,
        sig,
        now_sec=1_700_000_000 + 301,
    )
    assert result["ok"] is False
    assert result["reason"] == "timestamp_expired"


def test_parse_event():
    raw = '{"type":"invoice.paid","id":"evt_1","data":{"id":"in_1"}}'
    event = parse_billing_webhook_event(raw)
    assert event is not None
    assert event["type"] == "invoice.paid"
