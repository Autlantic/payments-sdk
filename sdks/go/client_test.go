package billing

import "testing"

func TestAPIVersion(t *testing.T) {
	if APIVersion != "2026-01-01" {
		t.Fatalf("unexpected APIVersion %s", APIVersion)
	}
	if SDKVersion != "0.1.1" {
		t.Fatalf("unexpected SDKVersion %s", SDKVersion)
	}
}

func TestNewRequiresKey(t *testing.T) {
	_, err := New("", DefaultAPIBaseURL, "")
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestModeFromLiveKey(t *testing.T) {
	c, err := New("abk_live_demo", DefaultAPIBaseURL, "mer_x")
	if err != nil {
		t.Fatal(err)
	}
	if c.Mode != "live" {
		t.Fatalf("mode=%s", c.Mode)
	}
}

func TestParitySurfaceMethodsExist(t *testing.T) {
	c, err := New("abk_test_demo", DefaultAPIBaseURL, "")
	if err != nil {
		t.Fatal(err)
	}
	_ = c.ListInvoices
	_ = c.GetInvoice
	_ = c.RefundInvoice
	_ = c.RefundPayment
	_ = c.VoidInvoice
	_ = c.ProvisionConnectedMerchant
	_ = c.ListConnectedMerchants
	_ = c.GetConnectedMerchant
	_ = c.UpdateConnectedMerchant
	_ = c.DisableConnectedMerchant
	_ = c.CreateConnectedApiKey
	_ = c.ListConnectedWebhookEndpoints
	_ = c.CreateConnectedWebhookEndpoint
}
