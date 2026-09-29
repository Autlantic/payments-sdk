import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeShopDomain } from "./shopify-auth.js";

function secret(): string {
  const value = process.env.SHOPIFY_API_SECRET?.trim();
  if (!value) throw new Error("Set SHOPIFY_API_SECRET");
  return value;
}

function sessionKey(): string {
  return (
    process.env.TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.SHOPIFY_API_SECRET?.trim() ||
    ""
  );
}

/** Verify Shopify OAuth / app proxy query HMAC (hex digest). */
export function verifyShopifyQueryHmac(query: Record<string, string>): boolean {
  const hmac = query.hmac;
  if (!hmac) return false;
  const message = Object.keys(query)
    .filter((k) => k !== "hmac" && k !== "signature")
    .sort()
    .map((k) => `${k}=${Array.isArray(query[k]) ? query[k] : query[k]}`)
    .join("&");
  const digest = createHmac("sha256", secret()).update(message).digest("hex");
  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(hmac, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Verify Shopify webhook body HMAC (base64). */
export function verifyShopifyWebhookHmac(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) return false;
  const digest = createHmac("sha256", secret()).update(rawBody, "utf8").digest("base64");
  try {
    const a = Buffer.from(digest);
    const b = Buffer.from(hmacHeader);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function createShopSessionCookie(shopDomain: string): string {
  const shop = normalizeShopDomain(shopDomain);
  const exp = String(Date.now() + SESSION_TTL_MS);
  const payload = `${shop}|${exp}`;
  const sig = createHmac("sha256", sessionKey()).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifyShopSessionCookie(
  cookieValue: string | undefined,
  shopDomain: string,
): boolean {
  if (!cookieValue) return false;
  try {
    const decoded = Buffer.from(cookieValue, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 3) return false;
    const [shop, exp, sig] = parts;
    if (!shop || !exp || !sig) return false;
    if (normalizeShopDomain(shop) !== normalizeShopDomain(shopDomain)) return false;
    if (Number(exp) < Date.now()) return false;
    const payload = `${shop}|${exp}`;
    const expected = createHmac("sha256", sessionKey()).update(payload).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function createCsrfToken(shopDomain: string): string {
  const shop = normalizeShopDomain(shopDomain);
  const nonce = createHmac("sha256", sessionKey())
    .update(`csrf.${shop}.${Date.now()}`)
    .digest("hex")
    .slice(0, 24);
  const payload = `${shop}|${nonce}`;
  const sig = createHmac("sha256", sessionKey()).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifyCsrfToken(token: string, shopDomain: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 3) return false;
    const [shop, nonce, sig] = parts;
    if (!shop || !nonce || !sig) return false;
    if (normalizeShopDomain(shop) !== normalizeShopDomain(shopDomain)) return false;
    const payload = `${shop}|${nonce}`;
    const expected = createHmac("sha256", sessionKey()).update(payload).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}
