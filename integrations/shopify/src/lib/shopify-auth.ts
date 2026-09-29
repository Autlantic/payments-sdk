import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { upsertShopInstall } from "./db.js";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name}`);
  return value;
}

export function normalizeShopDomain(shop: string): string {
  return shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

function appHost(): string {
  return requireEnv("SHOPIFY_APP_URL").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function scopes(): string {
  return (process.env.SCOPES ?? "read_orders,write_orders")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");
}

function createOauthState(shopDomain: string): string {
  const nonce = randomBytes(8).toString("hex");
  const exp = String(Date.now() + 15 * 60 * 1000);
  const payload = `${shopDomain}.${exp}.${nonce}`;
  const sig = createHmac("sha256", requireEnv("SHOPIFY_API_SECRET")).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyOauthState(state: string, shop: string): boolean {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [shopDomain, exp, nonce, sig] = decoded.split(".");
    if (!shopDomain || !exp || !nonce || !sig) return false;
    if (normalizeShopDomain(shopDomain) !== normalizeShopDomain(shop)) return false;
    if (Number(exp) < Date.now()) return false;
    const payload = `${shopDomain}.${exp}.${nonce}`;
    const expected = createHmac("sha256", requireEnv("SHOPIFY_API_SECRET"))
      .update(payload)
      .digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function beginAuthUrl(shop: string): string {
  const shopDomain = normalizeShopDomain(shop);
  const query = new URLSearchParams({
    client_id: requireEnv("SHOPIFY_API_KEY"),
    scope: scopes(),
    redirect_uri: `https://${appHost()}/auth/callback`,
    state: createOauthState(shopDomain),
  });
  return `https://${shopDomain}/admin/oauth/authorize?${query.toString()}`;
}

export async function completeAuth(query: Record<string, string>): Promise<{ shop: string }> {
  const shop = normalizeShopDomain(query.shop ?? "");
  if (!shop || !query.code || !query.state) {
    throw new Error("Missing shop, code, or state");
  }
  if (!verifyOauthState(query.state, shop)) {
    throw new Error("Invalid OAuth state");
  }

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: requireEnv("SHOPIFY_API_KEY"),
      client_secret: requireEnv("SHOPIFY_API_SECRET"),
      code: query.code,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Shopify token exchange failed: ${await tokenRes.text()}`);
  }
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    scope?: string;
  };
  if (!tokenJson.access_token) {
    throw new Error("Shopify token exchange returned no access_token");
  }

  await upsertShopInstall({
    shopDomain: shop,
    accessToken: tokenJson.access_token,
    scopes: tokenJson.scope ?? "",
  });

  return { shop };
}
