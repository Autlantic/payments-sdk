package billing

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// Error is a hosted API or client configuration error.
type Error struct {
	Message    string
	Code       string
	StatusCode int
	RequestID  string
	Body       any
}

func (e *Error) Error() string {
	if e.Code != "" {
		return fmt.Sprintf("%s (%s)", e.Message, e.Code)
	}
	return e.Message
}

// Client talks to the hosted Billing API (no in-process sandbox).
type Client struct {
	APIKey     string
	APIBaseURL string
	MerchantID string
	HTTPClient *http.Client
	Mode       string
}

// NewFromEnv builds a client from AUTLANTIC_BILLING_* env vars.
func NewFromEnv() (*Client, error) {
	apiKey := strings.TrimSpace(os.Getenv("AUTLANTIC_BILLING_API_KEY"))
	if apiKey == "" {
		return nil, &Error{Message: "AUTLANTIC_BILLING_API_KEY is required", Code: "configuration"}
	}
	base := strings.TrimSpace(os.Getenv("AUTLANTIC_BILLING_API_URL"))
	if base == "" {
		base = DefaultAPIBaseURL
	}
	return New(apiKey, base, strings.TrimSpace(os.Getenv("AUTLANTIC_BILLING_MERCHANT_ID")))
}

// New constructs a hosted client.
func New(apiKey, apiBaseURL, merchantID string) (*Client, error) {
	apiKey = strings.TrimSpace(apiKey)
	if apiKey == "" {
		return nil, &Error{Message: "api_key is required", Code: "configuration"}
	}
	if strings.TrimSpace(apiBaseURL) == "" {
		apiBaseURL = DefaultAPIBaseURL
	}
	mode := "test"
	if strings.Contains(apiKey, "_live_") {
		mode = "live"
	}
	return &Client{
		APIKey:     apiKey,
		APIBaseURL: strings.TrimRight(apiBaseURL, "/"),
		MerchantID: merchantID,
		HTTPClient: &http.Client{Timeout: 30 * time.Second},
		Mode:       mode,
	}, nil
}

func (c *Client) ListProducts() (map[string]any, error) {
	return c.request("GET", "/v1/products", nil, false)
}

func (c *Client) CreateSubscription(body map[string]any) (map[string]any, error) {
	return c.request("POST", "/v1/subscriptions", body, true)
}

func (c *Client) GetSubscription(id string) (map[string]any, error) {
	return c.request("GET", "/v1/subscriptions/"+url.PathEscape(id), nil, false)
}

func (c *Client) ActivateSubscription(id string) (map[string]any, error) {
	return c.request("POST", "/v1/subscriptions/"+url.PathEscape(id)+"/activate", map[string]any{}, true)
}

func (c *Client) CancelSubscription(id string, body map[string]any) (map[string]any, error) {
	if body == nil {
		body = map[string]any{}
	}
	return c.request("POST", "/v1/subscriptions/"+url.PathEscape(id)+"/cancel", body, true)
}

func (c *Client) CreatePayment(body map[string]any) (map[string]any, error) {
	return c.request("POST", "/v1/payments", body, true)
}

func (c *Client) GetPayment(id string) (map[string]any, error) {
	return c.request("GET", "/v1/payments/"+url.PathEscape(id), nil, false)
}

func (c *Client) CreatePaymentLink(body map[string]any) (map[string]any, error) {
	return c.request("POST", "/v1/payment-links", body, true)
}

func (c *Client) ListPaymentLinks() (map[string]any, error) {
	return c.request("GET", "/v1/payment-links", nil, false)
}

func (c *Client) GetPaymentLink(id string) (map[string]any, error) {
	return c.request("GET", "/v1/payment-links/"+url.PathEscape(id), nil, false)
}

func (c *Client) DisablePaymentLink(id string) (map[string]any, error) {
	return c.request("POST", "/v1/payment-links/"+url.PathEscape(id)+"/disable", map[string]any{}, true)
}

func (c *Client) request(method, path string, body map[string]any, idempotent bool) (map[string]any, error) {
	requestID := fmt.Sprintf("req_%d_%x", time.Now().UnixMilli(), time.Now().UnixNano()&0xffff)
	var payloadBytes []byte
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		payloadBytes = b
	}
	idemKey := ""
	if method == "POST" && idempotent {
		idemKey = fmt.Sprintf("sdk_%d_%x", time.Now().UnixMilli(), time.Now().UnixNano()&0xffff)
	}

	maxAttempts := 3
	var lastErr error
	for attempt := 0; attempt < maxAttempts; attempt++ {
		var buf io.Reader
		if payloadBytes != nil {
			buf = bytes.NewReader(payloadBytes)
		}
		req, err := http.NewRequest(method, c.APIBaseURL+path, buf)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", UserAgent)
		req.Header.Set("X-Autlantic-Api-Key", c.APIKey)
		req.Header.Set("X-Autlantic-Sdk-Version", SDKVersion)
		req.Header.Set("X-Autlantic-Client-Request-Id", requestID)
		req.Header.Set("Autlantic-Version", APIVersion)
		if body != nil {
			req.Header.Set("Content-Type", "application/json")
		}
		if idemKey != "" {
			req.Header.Set("Idempotency-Key", idemKey)
		}

		res, err := c.HTTPClient.Do(req)
		if err != nil {
			lastErr = &Error{Message: err.Error(), Code: "network_error", RequestID: requestID}
			if attempt+1 < maxAttempts {
				time.Sleep(time.Duration(250*(1<<attempt)) * time.Millisecond)
				continue
			}
			return nil, lastErr
		}
		raw, readErr := io.ReadAll(res.Body)
		res.Body.Close()
		if readErr != nil {
			return nil, readErr
		}
		var payload map[string]any
		if len(raw) > 0 {
			if err := json.Unmarshal(raw, &payload); err != nil {
				payload = map[string]any{"error": string(raw)}
			}
		} else {
			payload = map[string]any{}
		}
		if res.StatusCode >= 200 && res.StatusCode < 300 {
			return payload, nil
		}
		msg, _ := payload["error"].(string)
		if msg == "" {
			msg = res.Status
		}
		code, _ := payload["code"].(string)
		lastErr = &Error{
			Message:    msg,
			Code:       code,
			StatusCode: res.StatusCode,
			RequestID:  requestID,
			Body:       payload,
		}
		if retryableStatus(res.StatusCode) && attempt+1 < maxAttempts {
			time.Sleep(time.Duration(250*(1<<attempt)) * time.Millisecond)
			continue
		}
		return nil, lastErr
	}
	return nil, lastErr
}

func retryableStatus(code int) bool {
	switch code {
	case 408, 429, 500, 502, 503, 504:
		return true
	default:
		return false
	}
}
