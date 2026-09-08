package billing

import "testing"

func TestAPIVersion(t *testing.T) {
	if APIVersion != "2026-01-01" {
		t.Fatalf("unexpected APIVersion %s", APIVersion)
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
