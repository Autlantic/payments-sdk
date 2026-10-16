import { createHmac, timingSafeEqual } from "node:crypto";
import type { BillingWebhookEvent } from "@autlantic/payments-recurring-core";
import { BILLING_WEBHOOK_SIGNATURE_HEADER } from "@autlantic/payments-recurring-core";
import { AutlanticBillingError } from "./errors";

export { BILLING_WEBHOOK_SIGNATURE_HEADER };

/** Default skew for timestamped webhook signatures (5 minutes). */
export const BILLING_WEBHOOK_TOLERANCE_SEC = 300;

export type WebhookVerifyFailureReason =
  | "missing_header"
  | "empty_secret"
  | "length_mismatch"
  | "invalid_signature"
  | "compare_error"
  | "timestamp_expired"
  | "timestamp_invalid"
  | "legacy_signature_rejected";

export type WebhookVerifyResult =
  | { ok: true }
  | { ok: false; reason: WebhookVerifyFailureReason };

export type WebhookParseFailureReason = "invalid_json" | "missing_fields";

export type WebhookParseResult =
  | { ok: true; event: BillingWebhookEvent }
  | { ok: false; reason: WebhookParseFailureReason };

function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * Sign webhook body. Emits Stripe-style `t=<unix>,v1=<hmac>` where
 * hmac = HMAC-SHA256(secret, `${t}.${rawBody}`).
 */
export function signBillingWebhookBody(
  secret: string,
  rawBody: string,
  timestampSec = Math.floor(Date.now() / 1000),
): string {
  const t = String(timestampSec);
  const v1 = hmacHex(secret, `${t}.${rawBody}`);
  return `t=${t},v1=${v1}`;
}

export function signBillingWebhook(
  secret: string,
  event: BillingWebhookEvent,
): { body: string; signature: string } {
  const body = JSON.stringify(event);
  return { body, signature: signBillingWebhookBody(secret, body) };
}

/**
 * Verify webhook HMAC. Prefer {@link verifyBillingWebhookDetailed} when you need
 * a failure reason for logs / metrics.
 *
 * Argument order: `(secret, rawBody, signatureHeader)`.
 * Accepts timestamped `t=…,v1=…` and legacy raw hex (backward compatible).
 */
export function verifyBillingWebhook(
  secret: string,
  rawBody: string,
  signatureHeader: string | null | undefined,
  options?: { toleranceSec?: number; nowSec?: number },
): boolean {
  return verifyBillingWebhookDetailed(secret, rawBody, signatureHeader, options).ok;
}

/** Same as {@link verifyBillingWebhook}, with structured failure reasons. */
export function verifyBillingWebhookDetailed(
  secret: string,
  rawBody: string,
  signatureHeader: string | null | undefined,
  options?: { toleranceSec?: number; nowSec?: number },
): WebhookVerifyResult {
  if (!secret.trim()) return { ok: false, reason: "empty_secret" };
  if (!signatureHeader?.trim()) return { ok: false, reason: "missing_header" };

  const header = signatureHeader.trim();
  const tolerance = options?.toleranceSec ?? BILLING_WEBHOOK_TOLERANCE_SEC;
  const now = options?.nowSec ?? Math.floor(Date.now() / 1000);

  // New format: t=<unix>,v1=<hex>
  if (header.includes("t=") && header.includes("v1=")) {
    const parts = Object.fromEntries(
      header.split(",").map((p) => {
        const i = p.indexOf("=");
        return i === -1 ? [p, ""] : [p.slice(0, i), p.slice(i + 1)];
      }),
    );
    const t = Number(parts.t);
    const v1 = parts.v1?.trim() ?? "";
    if (!Number.isFinite(t) || !v1) return { ok: false, reason: "timestamp_invalid" };
    if (Math.abs(now - t) > tolerance) return { ok: false, reason: "timestamp_expired" };
    const expected = hmacHex(secret, `${t}.${rawBody}`);
    if (!safeEqualHex(expected, v1)) return { ok: false, reason: "invalid_signature" };
    return { ok: true };
  }

  // Legacy raw hex (HMAC of body only, no timestamp) is rejected in production.
  const allowLegacy =
    process.env.AUTLANTIC_BILLING_ALLOW_LEGACY_WEBHOOK_SIG === "true" ||
    process.env.NODE_ENV !== "production";
  if (!allowLegacy) {
    return { ok: false, reason: "legacy_signature_rejected" };
  }

  const expected = hmacHex(secret, rawBody);
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(header, "utf8");
    if (a.length !== b.length) return { ok: false, reason: "length_mismatch" };
    if (!timingSafeEqual(a, b)) return { ok: false, reason: "invalid_signature" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "compare_error" };
  }
}

/**
 * Throw {@link AutlanticBillingError} when verification fails.
 * Useful in Express / Next route handlers.
 */
export function assertBillingWebhook(
  secret: string,
  rawBody: string,
  signatureHeader: string | null | undefined,
): void {
  const result = verifyBillingWebhookDetailed(secret, rawBody, signatureHeader);
  if (result.ok) return;
  const code =
    result.reason === "missing_header" || result.reason === "empty_secret"
      ? "webhook_missing_header"
      : result.reason === "timestamp_expired"
        ? "webhook_timestamp_expired"
        : "webhook_invalid_signature";
  throw new AutlanticBillingError({
    message: `Webhook signature verification failed (${result.reason})`,
    code,
    type: "webhook_error",
    statusCode: 400,
    details: { reason: result.reason },
  });
}

export function parseBillingWebhookEvent(rawBody: string): BillingWebhookEvent | null {
  const result = parseBillingWebhookEventDetailed(rawBody);
  return result.ok ? result.event : null;
}

/** Parse webhook JSON with a structured failure reason. */
export function parseBillingWebhookEventDetailed(rawBody: string): WebhookParseResult {
  try {
    const parsed = JSON.parse(rawBody) as BillingWebhookEvent;
    if (!parsed?.type || !parsed.id) return { ok: false, reason: "missing_fields" };
    return { ok: true, event: parsed };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}
