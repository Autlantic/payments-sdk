// Package billing is the official Autlantic Billing server client (hosted API).
package billing

const (
	// SDKVersion is the Go package semver.
	SDKVersion = "0.1.0"
	// APIVersion is the hosted Autlantic-Version pin.
	APIVersion = "2026-01-01"
	// UserAgent sent on hosted requests.
	UserAgent = "autlantic-go/" + SDKVersion
	// DefaultAPIBaseURL is production billing-api.
	DefaultAPIBaseURL = "https://billing.autlantic.com"
	// WebhookSignatureHeader is the signature header merchants must verify.
	WebhookSignatureHeader = "x-autlantic-signature"
	// WebhookToleranceSec is the default skew for timestamped signatures.
	WebhookToleranceSec = 300
)
