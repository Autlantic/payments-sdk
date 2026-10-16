import type { BillingWebhookEvent } from "@autlantic/payments-recurring-core";

export type WebhookDeliveryResult = {
  eventId: string;
  ok: boolean;
  statusCode?: number;
  error?: string;
  attempts?: number;
};

const MAX_ATTEMPTS = 3;
const RETRY_MS = [0, 1000, 3000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deliverBillingWebhooks(
  url: string,
  events: BillingWebhookEvent[],
  sign: (body: string) => string,
  headerName = "x-autlantic-signature",
): Promise<WebhookDeliveryResult[]> {
  const results: WebhookDeliveryResult[] = [];

  for (const event of events) {
    const body = JSON.stringify(event);
    let lastError: string | undefined;
    let statusCode: number | undefined;
    let ok = false;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (RETRY_MS[attempt]) await sleep(RETRY_MS[attempt]!);

      try {
        // Never follow redirects (SSRF via 302 to metadata/internal hosts).
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [headerName]: sign(body),
            "X-Autlantic-Webhook-Attempt": String(attempt + 1),
          },
          body,
          redirect: "manual",
        });
        statusCode = res.status;
        if (res.status >= 300 && res.status < 400) {
          lastError = `Redirect not allowed (${res.status})`;
          continue;
        }
        if (res.ok) {
          ok = true;
          break;
        }
        lastError = await res.text().catch(() => res.statusText);
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Delivery failed";
      }
    }

    results.push({
      eventId: event.id,
      ok,
      statusCode,
      error: ok ? undefined : lastError,
      attempts: ok ? 1 : MAX_ATTEMPTS,
    });
  }

  return results;
}
