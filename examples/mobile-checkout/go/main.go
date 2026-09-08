// Hosted-mode merchant backend sample for Autlantic mobile Checkout (Go SDK).
//
//	go run .   # from this directory, with AUTLANTIC_BILLING_* set
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	billing "github.com/Autlantic/payments-sdk/sdks/go"
)

type accessRow struct {
	Active    bool   `json:"active"`
	UpdatedAt string `json:"updatedAt"`
	Kind      string `json:"kind"`
}

func main() {
	if strings.TrimSpace(os.Getenv("AUTLANTIC_BILLING_API_KEY")) == "" {
		log.Fatal("Set AUTLANTIC_BILLING_API_KEY (and related hosted env) before starting")
	}

	port := envOr("PORT", "3057")
	scheme := strings.TrimRight(envOr("MOBILE_RETURN_SCHEME", "myapp"), ":/")
	successURL := envOr("MOBILE_SUCCESS_URL", scheme+"://billing/success")
	cancelURL := envOr("MOBILE_CANCEL_URL", scheme+"://billing/cancel")
	payout := envOr("AUTLANTIC_PAYOUT_ADDRESS_EVM", "0x1111111111111111111111111111111111111111")
	webhookSecret := envOr("AUTLANTIC_BILLING_WEBHOOK_SECRET", "whsec_mobile_example")

	client, err := billing.NewFromEnv()
	if err != nil {
		log.Fatal(err)
	}

	var mu sync.Mutex
	access := map[string]accessRow{}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok": true, "mode": "hosted", "sdk": "go",
			"successUrl": successURL, "cancelUrl": cancelURL,
		})
	})

	mux.HandleFunc("/api/checkout", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method", http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			AmountUsdc  float64 `json:"amountUsdc"`
			MerchantRef string  `json:"merchantRef"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body.AmountUsdc == 0 {
			body.AmountUsdc = 20
		}
		merchantRef := strings.TrimSpace(body.MerchantRef)
		if merchantRef == "" {
			merchantRef = fmt.Sprintf("mobile_%d", time.Now().UnixMilli())
		}
		mu.Lock()
		access[merchantRef] = accessRow{Active: false, UpdatedAt: time.Now().UTC().Format(time.RFC3339), Kind: "payment_link"}
		mu.Unlock()

		created, err := client.CreatePaymentLink(map[string]any{
			"merchantRefPrefix": merchantRef,
			"payoutAddressEvm":  payout,
			"amountUsdc":        body.AmountUsdc,
			"description":       "Mobile checkout demo (Go)",
			"maxUses":           1,
			"successUrl":        successURL,
			"cancelUrl":         cancelURL,
		})
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
			return
		}
		linkID := ""
		if pl, ok := created["paymentLink"].(map[string]any); ok {
			if id, ok := pl["id"].(string); ok {
				linkID = id
			}
		}
		writeJSON(w, http.StatusCreated, map[string]any{
			"kind": "payment_link", "merchantRef": merchantRef,
			"checkoutUrl": created["url"], "paymentLinkId": linkID,
			"successUrl": successURL, "cancelUrl": cancelURL,
		})
	})

	mux.HandleFunc("/api/access/", func(w http.ResponseWriter, r *http.Request) {
		ref := strings.TrimPrefix(r.URL.Path, "/api/access/")
		mu.Lock()
		row, ok := access[ref]
		mu.Unlock()
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Unknown merchantRef"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"merchantRef": ref, "active": row.Active, "updatedAt": row.UpdatedAt, "kind": row.Kind,
		})
	})

	mux.HandleFunc("/webhooks/autlantic", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method", http.StatusMethodNotAllowed)
			return
		}
		rawBytes, _ := io.ReadAll(r.Body)
		raw := string(rawBytes)
		sig := r.Header.Get("x-autlantic-signature")
		if !billing.VerifyWebhook(webhookSecret, raw, sig) {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "bad signature"})
			return
		}
		event, err := billing.ParseWebhookEvent(raw)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "bad body"})
			return
		}
		eventType, _ := event["type"].(string)
		data, _ := event["data"].(map[string]any)
		merchantRef, _ := data["merchantRef"].(string)
		if merchantRef == "" {
			merchantRef, _ = data["merchant_ref"].(string)
		}
		if merchantRef != "" && (eventType == "invoice.paid" || eventType == "payment.paid" || eventType == "subscription.activated") {
			mu.Lock()
			access[merchantRef] = accessRow{Active: true, UpdatedAt: time.Now().UTC().Format(time.RFC3339), Kind: eventType}
			mu.Unlock()
		}
		writeJSON(w, http.StatusOK, map[string]any{"received": true, "type": eventType})
	})

	addr := ":" + port
	log.Printf("[go-mobile-checkout] http://localhost%s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func envOr(k, def string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return def
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
