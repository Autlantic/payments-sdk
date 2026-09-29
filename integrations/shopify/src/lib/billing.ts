import { AutlanticBilling, billingModeFromApiKey } from "@autlantic/payments-recurring";
import type { ShopRecord } from "./db.js";

export function appBaseUrl(): string {
  const url = (process.env.SHOPIFY_APP_URL ?? process.env.AUTLANTIC_SHOPIFY_APP_URL ?? "").trim();
  return url.replace(/\/$/, "");
}

/** Billing client for this Shopify shop's Autlantic merchant (not a shared Autlantic key). */
export function createBillingForShop(shop: ShopRecord): AutlanticBilling {
  const apiKey = shop.billingApiKey.trim();
  if (!apiKey) {
    throw new Error("Connect Autlantic Billing in app settings (API key missing)");
  }
  const apiBaseUrl = shop.billingApiUrl.trim() || "https://billing.autlantic.com";
  const sandbox = billingModeFromApiKey(apiKey) === "test";
  return new AutlanticBilling({
    apiKey,
    apiBaseUrl,
    merchantId: "mer_shopify",
    sandbox,
  });
}
