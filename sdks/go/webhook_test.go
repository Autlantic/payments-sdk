package billing

import "testing"

func TestSignAndVerify(t *testing.T) {
	body := `{"type":"invoice.paid","data":{}}`
	sig := SignWebhookBody("whsec_test", body, 1_700_000_000)
	if !VerifyWebhookDetailed("whsec_test", body, sig, WebhookToleranceSec, 1_700_000_000).OK {
		t.Fatal("expected verify ok")
	}
}

func TestRejectsExpired(t *testing.T) {
	body := `{"type":"invoice.paid","data":{}}`
	sig := SignWebhookBody("whsec_test", body, 1_700_000_000)
	r := VerifyWebhookDetailed("whsec_test", body, sig, WebhookToleranceSec, 1_700_000_000+301)
	if r.OK || r.Reason != "timestamp_expired" {
		t.Fatalf("expected timestamp_expired, got %+v", r)
	}
}

func TestParseEvent(t *testing.T) {
	raw := `{"type":"invoice.paid","id":"evt_1","data":{"id":"in_1"}}`
	event, err := ParseWebhookEvent(raw)
	if err != nil {
		t.Fatal(err)
	}
	if event["type"] != "invoice.paid" {
		t.Fatalf("unexpected type %v", event["type"])
	}
}
