import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { signBillingWebhookBody } from "@autlantic/payments-recurring";
import { handleRequest } from "./server.ts";

function mockReq(
  method: string,
  url: string,
  body?: string,
  headers?: Record<string, string>,
): IncomingMessage {
  const stream = Readable.from([body ?? ""]) as IncomingMessage;
  stream.method = method;
  stream.url = url;
  stream.headers = { host: "localhost:3055", ...(headers ?? {}) };
  return stream;
}

function mockRes(): ServerResponse & { statusCode: number; body: string } {
  const chunks: Buffer[] = [];
  const res = {
    statusCode: 200,
    body: "",
    writeHead(code: number) {
      this.statusCode = code;
      return this;
    },
    end(chunk?: string | Buffer) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      this.body = Buffer.concat(chunks).toString("utf8");
      return this;
    },
  };
  return res as unknown as ServerResponse & { statusCode: number; body: string };
}

describe("mobile-checkout example", () => {
  it("creates a sandbox payment link checkout", async () => {
    const res = mockRes();
    await handleRequest(
      mockReq("POST", "/api/checkout", JSON.stringify({ kind: "payment_link", amountUsdc: 12 })),
      res,
    );
    assert.equal(res.statusCode, 201);
    const json = JSON.parse(res.body) as {
      checkoutUrl: string;
      merchantRef: string;
      successUrl: string;
    };
    assert.ok(json.checkoutUrl.includes("sandbox://link/") || json.checkoutUrl.includes("/checkout/link/"));
    assert.ok(json.successUrl.includes("billing/success"));
  });

  it("grants access after a verified webhook", async () => {
    const createRes = mockRes();
    await handleRequest(
      mockReq("POST", "/api/checkout", JSON.stringify({ kind: "payment", merchantRef: "ref_webhook_1" })),
      createRes,
    );
    assert.equal(createRes.statusCode, 201);

    const event = {
      id: "evt_1",
      type: "payment.paid",
      createdAt: new Date().toISOString(),
      data: { merchantRef: "ref_webhook_1", id: "pay_1" },
    };
    const raw = JSON.stringify(event);
    const sig = signBillingWebhookBody("whsec_mobile_example", raw);
    const hookRes = mockRes();
    await handleRequest(
      mockReq("POST", "/webhooks/autlantic", raw, { "x-autlantic-signature": sig }),
      hookRes,
    );
    assert.equal(hookRes.statusCode, 200);

    const accessRes = mockRes();
    await handleRequest(mockReq("GET", "/api/access/ref_webhook_1"), accessRes);
    assert.equal(accessRes.statusCode, 200);
    const access = JSON.parse(accessRes.body) as { active: boolean };
    assert.equal(access.active, true);
  });
});
