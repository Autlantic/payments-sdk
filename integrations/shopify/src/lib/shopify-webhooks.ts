import { appBaseUrl } from "./billing.js";
import { normalizeShopDomain } from "./shopify-auth.js";

const API_VERSION = "2025-10";

const TOPICS = [
  "APP_UNINSTALLED",
  "CUSTOMERS_DATA_REQUEST",
  "CUSTOMERS_REDACT",
  "SHOP_REDACT",
] as const;

/** Register mandatory compliance + uninstall webhooks after OAuth. */
export async function registerAppWebhooks(input: {
  shopDomain: string;
  accessToken: string;
}): Promise<void> {
  const shop = normalizeShopDomain(input.shopDomain);
  const callbackUrl = `${appBaseUrl()}/webhooks/shopify`;
  for (const topic of TOPICS) {
    const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": input.accessToken,
      },
      body: JSON.stringify({
        query: `mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $callbackUrl: URL!) {
          webhookSubscriptionCreate(
            topic: $topic
            webhookSubscription: { callbackUrl: $callbackUrl, format: JSON }
          ) {
            userErrors { field message }
          }
        }`,
        variables: { topic, callbackUrl },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Webhook register HTTP ${res.status}: ${text}`);
    }
    const json = (await res.json()) as {
      data?: {
        webhookSubscriptionCreate?: { userErrors?: Array<{ message: string }> };
      };
      errors?: Array<{ message: string }>;
    };
    if (json.errors?.length) {
      // Topic already exists / unsupported in some plans — keep going.
      continue;
    }
    const errors = json.data?.webhookSubscriptionCreate?.userErrors ?? [];
    if (errors.length && !errors.some((e) => /already|taken|exists/i.test(e.message))) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
  }
}
