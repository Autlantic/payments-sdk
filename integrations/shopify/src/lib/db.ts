import pg from "pg";
import { decryptSecret, encryptSecret } from "./crypto.js";

const { Pool } = pg;

export type ShopRecord = {
  shopDomain: string;
  accessToken: string;
  scopes: string;
  billingApiKey: string;
  billingWebhookSecret: string;
  billingApiUrl: string;
  payoutAddressEvm: string;
  installedAt: number;
  updatedAt: number;
};

export type PaymentSessionRecord = {
  shopifyGid: string;
  shopDomain: string;
  amount: string;
  currency: string;
  gid: string;
  paymentLinkId?: string;
  checkoutUrl?: string;
  status: "pending" | "resolved" | "rejected";
  createdAt: number;
};

export type ActivityRow = {
  at: number;
  ok: boolean;
  type: string;
  message: string;
  shopDomain?: string;
};

let pool: pg.Pool | null = null;
let migrated = false;

function databaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required (Postgres) for multi-merchant Shopify shops");
  }
  return url;
}

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl(),
      ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pool;
}

export async function ensureSchema(): Promise<void> {
  if (migrated) return;
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS shops (
      shop_domain TEXT PRIMARY KEY,
      access_token_enc TEXT NOT NULL,
      scopes TEXT NOT NULL DEFAULT '',
      billing_api_key_enc TEXT NOT NULL DEFAULT '',
      billing_webhook_secret_enc TEXT NOT NULL DEFAULT '',
      billing_api_url TEXT NOT NULL DEFAULT 'https://billing.autlantic.com',
      payout_address_evm TEXT NOT NULL DEFAULT '',
      installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_sessions (
      gid TEXT PRIMARY KEY,
      shop_domain TEXT NOT NULL REFERENCES shops(shop_domain) ON DELETE CASCADE,
      amount TEXT NOT NULL,
      currency TEXT NOT NULL,
      payment_link_id TEXT,
      checkout_url TEXT,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS payment_sessions_link_idx ON payment_sessions (payment_link_id);
    CREATE INDEX IF NOT EXISTS payment_sessions_shop_idx ON payment_sessions (shop_domain);

    CREATE TABLE IF NOT EXISTS processed_events (
      event_id TEXT PRIMARY KEY,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activity (
      id BIGSERIAL PRIMARY KEY,
      at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ok BOOLEAN NOT NULL,
      type TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      shop_domain TEXT
    );
  `);
  migrated = true;
}

function normalizeShop(shop: string): string {
  return shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

function rowToShop(row: Record<string, unknown>): ShopRecord {
  return {
    shopDomain: String(row.shop_domain),
    accessToken: decryptSecret(String(row.access_token_enc ?? "")),
    scopes: String(row.scopes ?? ""),
    billingApiKey: decryptSecret(String(row.billing_api_key_enc ?? "")),
    billingWebhookSecret: decryptSecret(String(row.billing_webhook_secret_enc ?? "")),
    billingApiUrl: String(row.billing_api_url ?? "https://billing.autlantic.com"),
    payoutAddressEvm: String(row.payout_address_evm ?? ""),
    installedAt: new Date(String(row.installed_at)).getTime(),
    updatedAt: new Date(String(row.updated_at)).getTime(),
  };
}

export async function upsertShopInstall(input: {
  shopDomain: string;
  accessToken: string;
  scopes: string;
}): Promise<ShopRecord> {
  await ensureSchema();
  const shopDomain = normalizeShop(input.shopDomain);
  const db = getPool();
  const result = await db.query(
    `INSERT INTO shops (shop_domain, access_token_enc, scopes, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (shop_domain) DO UPDATE SET
       access_token_enc = EXCLUDED.access_token_enc,
       scopes = EXCLUDED.scopes,
       updated_at = NOW()
     RETURNING *`,
    [shopDomain, encryptSecret(input.accessToken), input.scopes],
  );
  return rowToShop(result.rows[0]);
}

export async function getShop(shopDomain: string): Promise<ShopRecord | null> {
  await ensureSchema();
  const result = await getPool().query(`SELECT * FROM shops WHERE shop_domain = $1`, [
    normalizeShop(shopDomain),
  ]);
  if (!result.rows[0]) return null;
  return rowToShop(result.rows[0]);
}

export async function saveShopBilling(input: {
  shopDomain: string;
  billingApiKey: string;
  billingWebhookSecret: string;
  billingApiUrl?: string;
  payoutAddressEvm: string;
}): Promise<ShopRecord> {
  await ensureSchema();
  const shopDomain = normalizeShop(input.shopDomain);
  const existing = await getShop(shopDomain);
  if (!existing) {
    throw new Error("Shop is not installed. Open the app install link first.");
  }

  const apiKey =
    input.billingApiKey.trim() && !input.billingApiKey.includes("…")
      ? input.billingApiKey.trim()
      : existing.billingApiKey;
  const webhookSecret =
    input.billingWebhookSecret.trim() && !input.billingWebhookSecret.includes("…")
      ? input.billingWebhookSecret.trim()
      : existing.billingWebhookSecret;

  const result = await getPool().query(
    `UPDATE shops SET
       billing_api_key_enc = $2,
       billing_webhook_secret_enc = $3,
       billing_api_url = $4,
       payout_address_evm = $5,
       updated_at = NOW()
     WHERE shop_domain = $1
     RETURNING *`,
    [
      shopDomain,
      encryptSecret(apiKey),
      encryptSecret(webhookSecret),
      (input.billingApiUrl ?? existing.billingApiUrl).replace(/\/$/, "") ||
        "https://billing.autlantic.com",
      input.payoutAddressEvm.trim(),
    ],
  );
  return rowToShop(result.rows[0]);
}

export function shopBillingConfigured(shop: ShopRecord): boolean {
  return Boolean(
    shop.billingApiKey.trim() &&
      shop.billingWebhookSecret.trim() &&
      shop.payoutAddressEvm.trim(),
  );
}

export async function putSession(record: PaymentSessionRecord): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO payment_sessions
      (gid, shop_domain, amount, currency, payment_link_id, checkout_url, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,to_timestamp($8/1000.0))
     ON CONFLICT (gid) DO UPDATE SET
       payment_link_id = EXCLUDED.payment_link_id,
       checkout_url = EXCLUDED.checkout_url,
       status = EXCLUDED.status`,
    [
      record.gid,
      normalizeShop(record.shopDomain),
      record.amount,
      record.currency,
      record.paymentLinkId ?? null,
      record.checkoutUrl ?? null,
      record.status,
      record.createdAt,
    ],
  );
}

export async function getSession(gid: string): Promise<PaymentSessionRecord | null> {
  await ensureSchema();
  const result = await getPool().query(`SELECT * FROM payment_sessions WHERE gid = $1`, [gid]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    shopifyGid: String(row.gid),
    shopDomain: String(row.shop_domain),
    amount: String(row.amount),
    currency: String(row.currency),
    gid: String(row.gid),
    paymentLinkId: row.payment_link_id ? String(row.payment_link_id) : undefined,
    checkoutUrl: row.checkout_url ? String(row.checkout_url) : undefined,
    status: row.status as PaymentSessionRecord["status"],
    createdAt: new Date(String(row.created_at)).getTime(),
  };
}

export async function findSessionByPaymentLink(
  linkId: string,
): Promise<PaymentSessionRecord | null> {
  await ensureSchema();
  const result = await getPool().query(
    `SELECT * FROM payment_sessions WHERE payment_link_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [linkId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return getSession(String(row.gid));
}

export async function markSession(
  gid: string,
  status: PaymentSessionRecord["status"],
): Promise<void> {
  await ensureSchema();
  await getPool().query(`UPDATE payment_sessions SET status = $2 WHERE gid = $1`, [gid, status]);
}

export async function alreadyProcessed(eventId: string): Promise<boolean> {
  await ensureSchema();
  const result = await getPool().query(`SELECT 1 FROM processed_events WHERE event_id = $1`, [
    eventId,
  ]);
  return result.rowCount !== null && result.rowCount > 0;
}

export async function markProcessed(eventId: string): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [eventId],
  );
  await getPool().query(`
    DELETE FROM processed_events
    WHERE event_id IN (
      SELECT event_id FROM processed_events ORDER BY processed_at ASC
      OFFSET 500
    )
  `);
}

export async function addActivity(row: Omit<ActivityRow, "at">): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO activity (ok, type, message, shop_domain) VALUES ($1,$2,$3,$4)`,
    [row.ok, row.type, row.message, row.shopDomain ? normalizeShop(row.shopDomain) : null],
  );
  await getPool().query(`
    DELETE FROM activity
    WHERE id IN (
      SELECT id FROM activity ORDER BY id DESC OFFSET 100
    )
  `);
}

export async function listActivity(limit = 30): Promise<ActivityRow[]> {
  await ensureSchema();
  const result = await getPool().query(
    `SELECT * FROM activity ORDER BY id DESC LIMIT $1`,
    [limit],
  );
  return result.rows.map((row) => ({
    at: new Date(String(row.at)).getTime(),
    ok: Boolean(row.ok),
    type: String(row.type ?? ""),
    message: String(row.message ?? ""),
    shopDomain: row.shop_domain ? String(row.shop_domain) : undefined,
  }));
}

export function webhookPathForShop(shopDomain: string, appBase: string): string {
  const shop = normalizeShop(shopDomain);
  return `${appBase.replace(/\/$/, "")}/webhooks/autlantic/${encodeURIComponent(shop)}`;
}
