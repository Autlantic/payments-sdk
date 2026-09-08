import {
  attemptInvoiceCharge,
  cancelSubscription,
  completeMandate,
  confirmOneTimePayment,
  createMemoryBillingStore,
  createOneTimePayment,
  createPaymentLink,
  createSubscription,
  disablePaymentLink,
  openPaymentLink,
  refundInvoice,
  resolvePaymentLinkStatus,
  resumeSubscription,
  updateSubscription,
  voidInvoice,
  type BillingStore,
  type ChargeInvoiceResult,
  type CreateOneTimePaymentResult,
  type CreateSubscriptionResult,
  type OneTimePayment,
  type PaymentLink,
  type SandboxChargeMode,
} from "@autlantic/billing-engine";
import { defaultSandboxChainId, VAULT_PLACEHOLDER_BASE_SEPOLIA } from "@autlantic/chain-evm";
import type { BillingInterval, RecurringInvoice, RecurringSubscription } from "@autlantic/payments-recurring-core";
import type {
  AutlanticBillingConfig,
  BillingCatalogProduct,
  CreatePaymentLinkRequest,
  CreatePaymentRequest,
  CreateSubscriptionRequest,
} from "./config";
import { AutlanticBillingError } from "./errors";
import {
  redactForLog,
  redactHeadersForLog,
  resolveBillingLogger,
  type BillingLogger,
} from "./logger";

export const AUTLANTIC_BILLING_SDK_VERSION = "0.3.12";

/** Hosted API contract pin (Stripe-style). Sent as `Autlantic-Version`. */
export const AUTLANTIC_API_VERSION = "2026-01-01";

type ApiEnvelope<T> = T & { error?: string; code?: string; requestId?: string };

/** Hosted mode from API key prefix (Stripe-style). */
export function billingModeFromApiKey(
  apiKey: string | null | undefined,
): "test" | "live" {
  const key = apiKey?.trim() ?? "";
  if (key.includes("_live_")) return "live";
  return "test";
}

/**
 * Sandbox charge / in-process behavior for fromEnv.
 * Test keys always sandbox. Live keys only with ALLOW_LIVE_SANDBOX break-glass.
 */
export function sandboxFromApiKeyAndEnv(
  apiKey: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (billingModeFromApiKey(apiKey) === "test") return true;
  const allow =
    env.AUTLANTIC_BILLING_ALLOW_LIVE_SANDBOX === "1" ||
    env.AUTLANTIC_BILLING_ALLOW_LIVE_SANDBOX === "true";
  return allow;
}

function newClientRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readRequestId(res: Response, fallback: string): string {
  return (
    res.headers.get("x-request-id") ||
    res.headers.get("x-autlantic-request-id") ||
    fallback
  );
}

export class AutlanticBilling {
  private readonly config: AutlanticBillingConfig;
  private readonly localStore: BillingStore | null;
  private readonly logger: BillingLogger;

  constructor(config: AutlanticBillingConfig) {
    this.config = config;
    this.logger = resolveBillingLogger({
      logger: config.logger,
      debug: config.debug,
      logLevel: config.logLevel,
    });
    this.localStore =
      !config.apiBaseUrl && config.sandbox !== false
        ? createMemoryBillingStore()
        : null;
    this.logger.debug("client.init", {
      sdkVersion: AUTLANTIC_BILLING_SDK_VERSION,
      merchantId: config.merchantId,
      mode: this.localStore ? "sandbox-in-process" : "hosted",
      sandbox: config.sandbox ?? null,
      hasApiKey: Boolean(config.apiKey),
      apiBaseUrl: config.apiBaseUrl ?? null,
    });
  }

  /** Effective logger (custom or resolved console / noop). */
  getLogger(): BillingLogger {
    return this.logger;
  }

  static sandbox(input: {
    merchantId: string;
    webhookSecret?: string;
    debug?: boolean;
    logger?: BillingLogger;
  }): AutlanticBilling {
    return new AutlanticBilling({
      merchantId: input.merchantId,
      sandbox: true,
      webhookSecret: input.webhookSecret ?? "whsec_billing_test",
      debug: input.debug,
      logger: input.logger,
    });
  }

  static fromEnv(env: Record<string, string | undefined> = process.env): AutlanticBilling {
    const apiKey = env.AUTLANTIC_BILLING_API_KEY?.trim();
    return new AutlanticBilling({
      apiBaseUrl: env.AUTLANTIC_BILLING_API_URL?.trim(),
      apiKey,
      merchantId: env.AUTLANTIC_BILLING_MERCHANT_ID?.trim() ?? "mer_default",
      sandbox: sandboxFromApiKeyAndEnv(apiKey, env),
      webhookSecret: env.AUTLANTIC_BILLING_WEBHOOK_SECRET?.trim(),
      debug:
        env.AUTLANTIC_BILLING_DEBUG === "1" ||
        env.AUTLANTIC_BILLING_DEBUG === "true",
      logLevel: (() => {
        const raw = env.AUTLANTIC_BILLING_LOG_LEVEL?.trim().toLowerCase();
        if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
        return undefined;
      })(),
    });
  }

  async createSubscription(
    input: CreateSubscriptionRequest,
  ): Promise<CreateSubscriptionResult & { checkoutUrl?: string }> {
    if (this.localStore) {
      if (input.amountUsdc == null || input.interval == null) {
        throw AutlanticBillingError.validation(
          "Sandbox mode requires amountUsdc and interval (priceId is only resolved by the hosted API)",
        );
      }
      const metadata = {
        ...(input.metadata ?? {}),
        ...(input.successUrl?.trim() ? { successUrl: input.successUrl.trim() } : {}),
        ...(input.cancelUrl?.trim() ? { cancelUrl: input.cancelUrl.trim() } : {}),
      };
      const result = createSubscription(this.localStore, {
        merchantId: this.config.merchantId,
        merchantRef: input.merchantRef,
        walletAddress: input.customerWallet,
        payoutAddressEvm: input.payoutAddressEvm,
        amountUsdc: input.amountUsdc,
        interval: input.interval,
        chainId: defaultSandboxChainId(),
        planId: input.planId ?? input.priceId,
        metadata: Object.keys(metadata).length ? metadata : undefined,
        vaultAddress: VAULT_PLACEHOLDER_BASE_SEPOLIA,
      });
      this.logger.debug("sandbox.createSubscription", {
        subscriptionId: result.subscription.id,
        amountUsdc: input.amountUsdc,
        interval: input.interval,
      });
      return {
        ...result,
        checkoutUrl: `sandbox://complete/${result.subscription.id}`,
      };
    }

    return this.post("/v1/subscriptions", input);
  }

  /**
   * Create a one-time USDC payment.
   * Hosted mode returns `checkoutUrl` for `/checkout/pay/:id`.
   */
  async createPayment(
    input: CreatePaymentRequest,
  ): Promise<CreateOneTimePaymentResult & { checkoutUrl?: string }> {
    if (this.localStore) {
      if (input.amountUsdc == null) {
        throw AutlanticBillingError.validation(
          "Sandbox mode requires amountUsdc (priceId is only resolved by the hosted API)",
        );
      }
      const metadata = {
        ...(input.metadata ?? {}),
        ...(input.successUrl?.trim() ? { successUrl: input.successUrl.trim() } : {}),
        ...(input.cancelUrl?.trim() ? { cancelUrl: input.cancelUrl.trim() } : {}),
      };
      const result = createOneTimePayment(this.localStore, {
        merchantId: this.config.merchantId,
        merchantRef: input.merchantRef,
        customerWallet: input.customerWallet,
        payoutAddressEvm: input.payoutAddressEvm,
        amountUsdc: input.amountUsdc,
        chainId: defaultSandboxChainId(),
        priceId: input.priceId,
        metadata: Object.keys(metadata).length ? metadata : undefined,
      });
      this.logger.debug("sandbox.createPayment", {
        paymentId: result.payment.id,
        amountUsdc: input.amountUsdc,
      });
      return {
        ...result,
        checkoutUrl: `sandbox://pay/${result.payment.id}`,
      };
    }

    return this.post("/v1/payments", input);
  }

  /**
   * Create a shareable payment link. Hosted mode returns `url` for `/checkout/link/:id`.
   */
  async createPaymentLink(
    input: CreatePaymentLinkRequest,
  ): Promise<{ paymentLink: PaymentLink; url: string }> {
    if (this.localStore) {
      if (input.amountUsdc == null) {
        throw AutlanticBillingError.validation(
          "Sandbox mode requires amountUsdc (priceId is only resolved by the hosted API)",
        );
      }
      const metadata = {
        ...(input.metadata ?? {}),
        ...(input.successUrl?.trim() ? { successUrl: input.successUrl.trim() } : {}),
        ...(input.cancelUrl?.trim() ? { cancelUrl: input.cancelUrl.trim() } : {}),
        ...(input.collectEmail ? { collectEmail: "1" } : {}),
        ...(input.collectName ? { collectName: "1" } : {}),
      };
      const paymentLink = createPaymentLink(this.localStore, {
        merchantId: this.config.merchantId,
        merchantRefPrefix: input.merchantRefPrefix?.trim() || "link",
        payoutAddressEvm: input.payoutAddressEvm,
        amountUsdc: input.amountUsdc,
        chainId: defaultSandboxChainId(),
        priceId: input.priceId,
        description: input.description,
        maxUses: input.maxUses,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        metadata: Object.keys(metadata).length ? metadata : undefined,
      });
      this.logger.debug("sandbox.createPaymentLink", {
        paymentLinkId: paymentLink.id,
        amountUsdc: input.amountUsdc,
      });
      return {
        paymentLink,
        url: `sandbox://link/${paymentLink.id}`,
      };
    }

    return this.post("/v1/payment-links", input);
  }

  async listPaymentLinks(): Promise<Array<PaymentLink & { url?: string }>> {
    if (this.localStore) {
      return this.localStore.listPaymentLinksByMerchant(this.config.merchantId).map((l) => ({
        ...l,
        status: resolvePaymentLinkStatus(l),
        url: `sandbox://link/${l.id}`,
      }));
    }
    const res = await this.get<{ paymentLinks: Array<PaymentLink & { url?: string }> }>(
      "/v1/payment-links",
    );
    return res.paymentLinks;
  }

  async getPaymentLink(id: string): Promise<{ paymentLink: PaymentLink; url?: string }> {
    if (this.localStore) {
      const paymentLink = this.localStore.getPaymentLink(id);
      if (!paymentLink) {
        throw AutlanticBillingError.notFound("Payment link not found", { id });
      }
      return {
        paymentLink: { ...paymentLink, status: resolvePaymentLinkStatus(paymentLink) },
        url: `sandbox://link/${paymentLink.id}`,
      };
    }
    return this.get(`/v1/payment-links/${id}`);
  }

  async disablePaymentLink(id: string): Promise<{ paymentLink: PaymentLink; url?: string }> {
    if (this.localStore) {
      const paymentLink = disablePaymentLink(this.localStore, id);
      if (!paymentLink) {
        throw AutlanticBillingError.notFound("Payment link not found", { id });
      }
      return { paymentLink, url: `sandbox://link/${paymentLink.id}` };
    }
    return this.post(`/v1/payment-links/${id}/disable`, {});
  }

  /**
   * Open a payment link (mint a one-time payment). Sandbox-only helper;
   * hosted checkout uses POST /checkout/link/:id/open.
   */
  async openPaymentLink(
    id: string,
    input: { customerWallet: string },
  ): Promise<{
    payment: OneTimePayment;
    paymentLink: PaymentLink;
    checkoutUrl?: string;
  }> {
    if (this.localStore) {
      const result = openPaymentLink(this.localStore, id, input);
      if ("error" in result) {
        throw new AutlanticBillingError({
          message: result.error,
          code: "payment_link_error",
          type: "validation_error",
          statusCode: 400,
          details: { paymentLinkId: id },
        });
      }
      return {
        payment: result.payment,
        paymentLink: result.paymentLink,
        checkoutUrl: `sandbox://pay/${result.payment.id}`,
      };
    }
    const base = this.requireApiBase();
    return this.fetchJson(`${base}/checkout/link/${id}/open`, {
      method: "POST",
      path: `/checkout/link/${id}/open`,
      body: input,
    });
  }

  async getPayment(id: string): Promise<OneTimePayment> {
    if (this.localStore) {
      const payment = this.localStore.getOneTimePayment(id);
      if (!payment) throw AutlanticBillingError.notFound("Payment not found", { id });
      return payment;
    }
    const res = await this.get<{ payment: OneTimePayment }>(`/v1/payments/${id}`);
    return res.payment;
  }

  async confirmPayment(
    id: string,
    input: { txHash?: string } = {},
  ): Promise<{ payment: OneTimePayment; alreadyPaid?: boolean }> {
    if (this.localStore) {
      const result = confirmOneTimePayment(this.localStore, id, input);
      if (!result) {
        throw new AutlanticBillingError({
          message: "Could not confirm payment",
          code: "payment_confirm_failed",
          type: "api_error",
          details: { paymentId: id },
        });
      }
      return { payment: result.payment, alreadyPaid: result.alreadyPaid };
    }

    const base = this.requireApiBase();
    return this.fetchJson(`${base}/checkout/pay/${id}/confirm`, {
      method: "POST",
      path: `/checkout/pay/${id}/confirm`,
      body: input,
    });
  }

  /** Active products and prices from the merchant catalog (hosted API). */
  async listProducts(): Promise<{ products: BillingCatalogProduct[] }> {
    if (this.localStore) {
      return { products: [] };
    }
    return this.get("/v1/products");
  }

  async listSubscriptions(input?: {
    status?: string;
  }): Promise<{ subscriptions: RecurringSubscription[] }> {
    if (this.localStore) {
      let subs = this.localStore.listSubscriptionsByMerchant(this.config.merchantId);
      if (input?.status) subs = subs.filter((s) => s.status === input.status);
      return { subscriptions: subs };
    }
    const query = input?.status ? `?status=${encodeURIComponent(input.status)}` : "";
    return this.get(`/v1/subscriptions${query}`);
  }

  async getCheckoutSession(id: string): Promise<{ session: unknown }> {
    const base = this.requireApiBase();
    return this.fetchJson(`${base}/checkout/subscribe/${id}.json`, {
      method: "GET",
      path: `/checkout/subscribe/${id}.json`,
      auth: false,
    });
  }

  async activateSubscription(
    id: string,
    input: { onChainSubscriptionId?: string } = {},
  ): Promise<{
    subscription: RecurringSubscription;
    charge: ChargeInvoiceResult | null;
    txHash?: string;
  }> {
    if (this.localStore) {
      const { activateSubscriptionCheckout } = await import("@autlantic/billing-engine");
      const result = activateSubscriptionCheckout(this.localStore, id, { sandbox: true });
      if (!result) {
        throw new AutlanticBillingError({
          message: "Could not activate subscription",
          code: "subscription_activate_failed",
          type: "api_error",
          details: { subscriptionId: id },
        });
      }
      return { subscription: result.subscription, charge: result.charge };
    }

    if (this.config.sandbox === false) {
      return this.post(`/v1/subscriptions/${id}/activate`, input);
    }

    const base = this.requireApiBase();
    return this.fetchJson(`${base}/checkout/subscribe/${id}/activate`, {
      method: "POST",
      path: `/checkout/subscribe/${id}/activate`,
      body: input,
    });
  }

  async getSubscription(id: string): Promise<RecurringSubscription> {
    if (this.localStore) {
      const sub = this.localStore.getSubscription(id);
      if (!sub) throw AutlanticBillingError.notFound("Subscription not found", { id });
      return sub;
    }
    const res = await this.get<{ subscription: RecurringSubscription }>(
      `/v1/subscriptions/${id}`,
    );
    return res.subscription;
  }

  async updateSubscription(
    id: string,
    input: {
      amountUsdc?: number;
      interval?: BillingInterval;
      planId?: string;
      metadata?: Record<string, string>;
    },
  ): Promise<{ subscription: RecurringSubscription }> {
    if (this.localStore) {
      const result = updateSubscription(this.localStore, id, input);
      if (!result) {
        throw new AutlanticBillingError({
          message: "Could not update subscription",
          code: "subscription_update_failed",
          type: "api_error",
          details: { subscriptionId: id },
        });
      }
      return { subscription: result.subscription };
    }
    return this.patch(`/v1/subscriptions/${id}`, input);
  }

  async completeSubscription(id: string): Promise<{ subscription: RecurringSubscription }> {
    if (this.localStore) {
      const result = completeMandate(this.localStore, id);
      if (!result) {
        throw new AutlanticBillingError({
          message: "Could not complete subscription",
          code: "subscription_activate_failed",
          type: "api_error",
          details: { subscriptionId: id },
        });
      }
      return { subscription: result.subscription };
    }
    return this.post(`/v1/subscriptions/${id}/complete`, {});
  }

  async cancelSubscription(
    id: string,
    immediate = false,
  ): Promise<{ subscription: RecurringSubscription }> {
    if (this.localStore) {
      const result = cancelSubscription(this.localStore, id, immediate);
      if (!result) {
        throw new AutlanticBillingError({
          message: "Could not cancel subscription",
          code: "subscription_cancel_failed",
          type: "api_error",
          details: { subscriptionId: id },
        });
      }
      return { subscription: result.subscription };
    }
    return this.post(`/v1/subscriptions/${id}/cancel`, { immediate });
  }

  /** Undo cancel-at-period-end so renewals continue. */
  async resumeSubscription(id: string): Promise<{ subscription: RecurringSubscription }> {
    if (this.localStore) {
      const result = resumeSubscription(this.localStore, id);
      if (!result) {
        throw new AutlanticBillingError({
          message: "Could not resume subscription",
          code: "subscription_resume_failed",
          type: "api_error",
          details: { subscriptionId: id },
        });
      }
      return { subscription: result.subscription };
    }
    return this.post(`/v1/subscriptions/${id}/resume`, {});
  }

  async listInvoices(input?: { subscriptionId?: string }): Promise<{ invoices: RecurringInvoice[] }> {
    if (this.localStore) {
      let invoices = this.localStore.listInvoicesByMerchant(this.config.merchantId);
      if (input?.subscriptionId) {
        invoices = invoices.filter((i) => i.subscriptionId === input.subscriptionId);
      }
      return { invoices };
    }
    const query = input?.subscriptionId
      ? `?subscriptionId=${encodeURIComponent(input.subscriptionId)}`
      : "";
    return this.get(`/v1/invoices${query}`);
  }

  async chargeInvoice(
    invoiceId: string,
    sandboxMode?: SandboxChargeMode,
  ): Promise<ChargeInvoiceResult> {
    if (this.localStore) {
      const result = attemptInvoiceCharge(this.localStore, invoiceId, {
        sandbox: true,
        sandboxMode,
      });
      if (!result) {
        throw new AutlanticBillingError({
          message: "Invoice not chargeable",
          code: "invoice_not_chargeable",
          type: "api_error",
          details: { invoiceId },
        });
      }
      return result;
    }
    return this.post(`/v1/invoices/${invoiceId}/charge`, { sandboxMode });
  }

  async refundInvoice(
    invoiceId: string,
    input: { amountUsdc?: number } = {},
  ): Promise<{ invoice: RecurringInvoice }> {
    if (this.localStore) {
      const result = refundInvoice(this.localStore, invoiceId, {
        sandbox: true,
        refundAmountUsdc: input.amountUsdc,
      });
      if (!result) {
        throw new AutlanticBillingError({
          message: "Invoice not refundable",
          code: "invoice_not_refundable",
          type: "api_error",
          details: { invoiceId },
        });
      }
      return { invoice: result.invoice };
    }
    return this.post(`/v1/invoices/${invoiceId}/refund`, input);
  }

  async voidInvoice(invoiceId: string): Promise<{ invoice: RecurringInvoice }> {
    if (this.localStore) {
      const result = voidInvoice(this.localStore, invoiceId);
      if (!result) {
        throw new AutlanticBillingError({
          message: "Invoice not voidable",
          code: "invoice_not_voidable",
          type: "api_error",
          details: { invoiceId },
        });
      }
      return { invoice: result.invoice };
    }
    return this.post(`/v1/invoices/${invoiceId}/void`, {});
  }

  async getInvoice(id: string): Promise<RecurringInvoice> {
    if (this.localStore) {
      const invoice = this.localStore.getInvoice(id);
      if (!invoice) throw AutlanticBillingError.notFound("Invoice not found", { id });
      return invoice;
    }
    const res = await this.get<{ invoice: RecurringInvoice }>(`/v1/invoices/${id}`);
    return res.invoice;
  }

  private requireApiBase(): string {
    const base = this.config.apiBaseUrl?.replace(/\/$/, "");
    if (!base) {
      throw AutlanticBillingError.configuration("apiBaseUrl is required for remote mode");
    }
    return base;
  }

  private headers(extra?: Record<string, string>, requestId?: string): Headers {
    const headers = new Headers(extra);
    if (this.config.apiKey) {
      headers.set("X-Autlantic-Api-Key", this.config.apiKey);
    }
    if (requestId) {
      headers.set("X-Autlantic-Client-Request-Id", requestId);
    }
    headers.set("X-Autlantic-Sdk-Version", AUTLANTIC_BILLING_SDK_VERSION);
    headers.set("Autlantic-Version", AUTLANTIC_API_VERSION);
    return headers;
  }

  private async get<T>(path: string): Promise<T> {
    const base = this.requireApiBase();
    return this.fetchJson(`${base}${path}`, { method: "GET", path });
  }

  private async post<T>(path: string, body: unknown, idempotent = true): Promise<T> {
    const base = this.requireApiBase();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (idempotent) {
      headers["Idempotency-Key"] = `sdk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
    return this.fetchJson(`${base}${path}`, {
      method: "POST",
      path,
      headers,
      body,
    });
  }

  private async patch<T>(path: string, body: unknown): Promise<T> {
    const base = this.requireApiBase();
    return this.fetchJson(`${base}${path}`, {
      method: "PATCH",
      path,
      headers: { "Content-Type": "application/json" },
      body,
    });
  }

  private async fetchJson<T>(
    url: string,
    init: {
      method: string;
      path: string;
      headers?: Record<string, string>;
      body?: unknown;
      /** When false, do not attach API key (public checkout JSON). Default true. */
      auth?: boolean;
    },
  ): Promise<T> {
    const requestId = newClientRequestId();
    const started = Date.now();
    const method = init.method;
    const headers =
      init.auth === false
        ? new Headers({
            ...(init.headers ?? {}),
            "X-Autlantic-Client-Request-Id": requestId,
            "X-Autlantic-Sdk-Version": AUTLANTIC_BILLING_SDK_VERSION,
            "Autlantic-Version": AUTLANTIC_API_VERSION,
          })
        : this.headers(init.headers, requestId);

    this.logger.debug("http.request", {
      requestId,
      method,
      path: init.path,
      headers: redactHeadersForLog(headers),
      body: init.body !== undefined ? redactForLog(init.body) : undefined,
    });

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
    } catch (cause) {
      const err = new AutlanticBillingError({
        message: cause instanceof Error ? cause.message : "Network request failed",
        code: "api_error",
        type: "api_error",
        requestId,
        path: init.path,
        method,
        cause,
      });
      this.logger.error("http.network_error", err.toJSON());
      throw err;
    }

    const correlationId = readRequestId(res, requestId);
    const elapsedMs = Date.now() - started;

    let json: ApiEnvelope<T> = {} as ApiEnvelope<T>;
    const text = await res.text();
    if (text) {
      try {
        json = JSON.parse(text) as ApiEnvelope<T>;
      } catch (cause) {
        const err = new AutlanticBillingError({
          message: `Invalid JSON response (${res.status})`,
          code: "api_error",
          type: "api_error",
          statusCode: res.status,
          requestId: correlationId,
          path: init.path,
          method,
          cause,
          details: { bodyPreview: text.slice(0, 200) },
        });
        this.logger.error("http.invalid_json", err.toJSON());
        throw err;
      }
    }

    if (!res.ok) {
      const err = AutlanticBillingError.fromHttp({
        statusCode: res.status,
        message: json.error ?? `Billing API error ${res.status}`,
        requestId: json.requestId ?? correlationId,
        path: init.path,
        method,
        code: json.code,
      });
      this.logger.warn("http.error", {
        ...err.toJSON(),
        elapsedMs,
        response: redactForLog(json),
      });
      throw err;
    }

    this.logger.debug("http.response", {
      requestId: correlationId,
      method,
      path: init.path,
      status: res.status,
      elapsedMs,
      body: redactForLog(json),
    });

    return json as T;
  }
}
