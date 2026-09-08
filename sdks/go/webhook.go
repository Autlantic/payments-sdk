package billing

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// WebhookVerifyResult mirrors the Node detailed verifier.
type WebhookVerifyResult struct {
	OK     bool
	Reason string
}

func hmacHex(secret, payload string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}

func safeEqualHex(a, b string) bool {
	ba := []byte(a)
	bb := []byte(b)
	if len(ba) != len(bb) {
		return false
	}
	return subtle.ConstantTimeCompare(ba, bb) == 1
}

// SignWebhookBody emits Stripe-style t=<unix>,v1=<hmac>.
func SignWebhookBody(secret, rawBody string, timestampSec int64) string {
	if timestampSec == 0 {
		timestampSec = time.Now().Unix()
	}
	t := strconv.FormatInt(timestampSec, 10)
	v1 := hmacHex(secret, t+"."+rawBody)
	return "t=" + t + ",v1=" + v1
}

// VerifyWebhookDetailed verifies x-autlantic-signature.
func VerifyWebhookDetailed(secret, rawBody, signatureHeader string, toleranceSec int, nowSec int64) WebhookVerifyResult {
	if strings.TrimSpace(secret) == "" {
		return WebhookVerifyResult{Reason: "empty_secret"}
	}
	if strings.TrimSpace(signatureHeader) == "" {
		return WebhookVerifyResult{Reason: "missing_header"}
	}
	if toleranceSec <= 0 {
		toleranceSec = WebhookToleranceSec
	}
	if nowSec == 0 {
		nowSec = time.Now().Unix()
	}
	header := strings.TrimSpace(signatureHeader)

	if strings.Contains(header, "t=") && strings.Contains(header, "v1=") {
		parts := map[string]string{}
		for _, piece := range strings.Split(header, ",") {
			k, v, ok := strings.Cut(piece, "=")
			if !ok {
				continue
			}
			parts[k] = v
		}
		t, err := strconv.ParseInt(parts["t"], 10, 64)
		v1 := strings.TrimSpace(parts["v1"])
		if err != nil || v1 == "" {
			return WebhookVerifyResult{Reason: "timestamp_invalid"}
		}
		skew := nowSec - t
		if skew < 0 {
			skew = -skew
		}
		if skew > int64(toleranceSec) {
			return WebhookVerifyResult{Reason: "timestamp_expired"}
		}
		expected := hmacHex(secret, fmt.Sprintf("%d.%s", t, rawBody))
		if !safeEqualHex(expected, v1) {
			return WebhookVerifyResult{Reason: "invalid_signature"}
		}
		return WebhookVerifyResult{OK: true}
	}

	expected := hmacHex(secret, rawBody)
	if len(expected) != len(header) {
		return WebhookVerifyResult{Reason: "length_mismatch"}
	}
	if !safeEqualHex(expected, header) {
		return WebhookVerifyResult{Reason: "invalid_signature"}
	}
	return WebhookVerifyResult{OK: true}
}

// VerifyWebhook is the boolean helper.
func VerifyWebhook(secret, rawBody, signatureHeader string) bool {
	return VerifyWebhookDetailed(secret, rawBody, signatureHeader, WebhookToleranceSec, 0).OK
}

// ParseWebhookEvent parses a webhook JSON body.
func ParseWebhookEvent(rawBody string) (map[string]any, error) {
	var event map[string]any
	if err := json.Unmarshal([]byte(rawBody), &event); err != nil {
		return nil, err
	}
	if _, ok := event["type"]; !ok {
		return nil, fmt.Errorf("missing type")
	}
	if _, ok := event["data"]; !ok {
		return nil, fmt.Errorf("missing data")
	}
	return event, nil
}
