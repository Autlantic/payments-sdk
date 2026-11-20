/**
 * Resolve / reject Shopify payment sessions via the Payments Apps GraphQL API.
 */

const API_VERSION = "2025-10";

/** Local E2E only. Never set in production / Railway. */
function e2eStubPayments(): boolean {
  return process.env.AUTLANTIC_SHOPIFY_E2E_STUB === "1";
}

export async function paymentSessionResolve(input: {
  shopDomain: string;
  accessToken: string;
  gid: string;
}): Promise<void> {
  if (e2eStubPayments()) return;
  await paymentsGraphql(input.shopDomain, input.accessToken, {
    query: `mutation PaymentSessionResolve($id: ID!) {
      paymentSessionResolve(id: $id) {
        paymentSession { id state { ... on PaymentSessionStateResolved { code } } }
        userErrors { field message }
      }
    }`,
    variables: { id: input.gid },
  });
}

export async function paymentSessionReject(input: {
  shopDomain: string;
  accessToken: string;
  gid: string;
  reasonMessage?: string;
}): Promise<void> {
  if (e2eStubPayments()) return;
  await paymentsGraphql(input.shopDomain, input.accessToken, {
    query: `mutation PaymentSessionReject($id: ID!, $reason: PaymentSessionRejectionReasonInput!) {
      paymentSessionReject(id: $id, reason: $reason) {
        paymentSession { id }
        userErrors { field message }
      }
    }`,
    variables: {
      id: input.gid,
      reason: {
        code: "PROCESSING_ERROR",
        merchantMessage: input.reasonMessage ?? "Payment failed",
      },
    },
  });
}

export async function refundSessionResolve(input: {
  shopDomain: string;
  accessToken: string;
  gid: string;
}): Promise<void> {
  if (e2eStubPayments()) return;
  await paymentsGraphql(input.shopDomain, input.accessToken, {
    query: `mutation RefundSessionResolve($id: ID!) {
      refundSessionResolve(id: $id) {
        refundSession { id state { ... on RefundSessionStateResolved { code } } }
        userErrors { field message }
      }
    }`,
    variables: { id: input.gid },
  });
}

export async function refundSessionReject(input: {
  shopDomain: string;
  accessToken: string;
  gid: string;
  reasonMessage?: string;
}): Promise<void> {
  if (e2eStubPayments()) return;
  await paymentsGraphql(input.shopDomain, input.accessToken, {
    query: `mutation RefundSessionReject($id: ID!, $reason: RefundSessionRejectionReasonInput!) {
      refundSessionReject(id: $id, reason: $reason) {
        refundSession { id }
        userErrors { field message }
      }
    }`,
    variables: {
      id: input.gid,
      reason: {
        code: "PROCESSING_ERROR",
        merchantMessage:
          input.reasonMessage ??
          "Autlantic refund failed. Retry from Shopify or refund from the Autlantic portal.",
      },
    },
  });
}

async function paymentsGraphql(
  shopDomain: string,
  accessToken: string,
  body: { query: string; variables: Record<string, unknown> },
): Promise<void> {
  const host = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const res = await fetch(`https://${host}/payments_apps/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Payments Apps API HTTP ${res.status}: ${text}`);
  }
  const json = (await res.json()) as {
    errors?: Array<{ message: string }>;
    data?: Record<string, { userErrors?: Array<{ message: string }> }>;
  };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  const payload = json.data ? Object.values(json.data)[0] : undefined;
  const userErrors = payload?.userErrors ?? [];
  if (userErrors.length) {
    throw new Error(userErrors.map((e) => e.message).join("; "));
  }
}
