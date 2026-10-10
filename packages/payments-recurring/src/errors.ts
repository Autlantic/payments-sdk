/**
 * Typed errors for `@autlantic/payments-recurring`.
 * Prefer `error.code` / `error.type` over string-matching `message`.
 */

export type AutlanticBillingErrorType =
  | "api_error"
  | "authentication_error"
  | "configuration_error"
  | "validation_error"
  | "not_found"
  | "webhook_error"
  | "idempotency_error";

export type AutlanticBillingErrorCode =
  | "api_error"
  | "authentication_error"
  | "configuration_error"
  | "validation_error"
  | "resource_missing"
  | "payment_link_error"
  | "payment_confirm_failed"
  | "subscription_activate_failed"
  | "subscription_update_failed"
  | "subscription_cancel_failed"
  | "invoice_not_chargeable"
  | "invoice_not_refundable"
  | "invoice_not_voidable"
  | "webhook_missing_header"
  | "webhook_invalid_signature"
  | "webhook_parse_failed"
  | "idempotency_error"
  | "workspace_plan_required"
  | (string & {});

export type AutlanticBillingErrorParams = {
  message: string;
  code?: AutlanticBillingErrorCode;
  type?: AutlanticBillingErrorType;
  statusCode?: number;
  /** Client-generated or server-returned request correlation id. */
  requestId?: string | null;
  path?: string;
  method?: string;
  /** Nested cause (network / JSON parse / etc.). */
  cause?: unknown;
  /** Extra structured context safe to log (already redact secrets before attaching). */
  details?: Record<string, unknown>;
};

export class AutlanticBillingError extends Error {
  readonly name = "AutlanticBillingError";
  readonly code: AutlanticBillingErrorCode;
  readonly type: AutlanticBillingErrorType;
  readonly statusCode: number | undefined;
  readonly requestId: string | null;
  readonly path: string | undefined;
  readonly method: string | undefined;
  readonly details: Record<string, unknown> | undefined;

  constructor(params: AutlanticBillingErrorParams) {
    super(params.message, params.cause !== undefined ? { cause: params.cause } : undefined);
    this.code = params.code ?? "api_error";
    this.type = params.type ?? inferType(params.statusCode, this.code);
    this.statusCode = params.statusCode;
    this.requestId = params.requestId ?? null;
    this.path = params.path;
    this.method = params.method;
    this.details = params.details;
  }

  /** JSON-safe shape for logs / APIs. */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      type: this.type,
      statusCode: this.statusCode ?? null,
      requestId: this.requestId,
      path: this.path ?? null,
      method: this.method ?? null,
      details: this.details ?? null,
    };
  }

  static is(err: unknown): err is AutlanticBillingError {
    return err instanceof AutlanticBillingError;
  }

  static fromHttp(input: {
    statusCode: number;
    message: string;
    requestId?: string | null;
    path?: string;
    method?: string;
    code?: string;
  }): AutlanticBillingError {
    const type = typeFromStatus(input.statusCode);
    const code =
      (input.code as AutlanticBillingErrorCode | undefined) ??
      codeFromStatus(input.statusCode);
    return new AutlanticBillingError({
      message: input.message,
      code,
      type,
      statusCode: input.statusCode,
      requestId: input.requestId,
      path: input.path,
      method: input.method,
    });
  }

  static configuration(message: string, details?: Record<string, unknown>): AutlanticBillingError {
    return new AutlanticBillingError({
      message,
      code: "configuration_error",
      type: "configuration_error",
      details,
    });
  }

  static notFound(message: string, details?: Record<string, unknown>): AutlanticBillingError {
    return new AutlanticBillingError({
      message,
      code: "resource_missing",
      type: "not_found",
      statusCode: 404,
      details,
    });
  }

  static validation(message: string, details?: Record<string, unknown>): AutlanticBillingError {
    return new AutlanticBillingError({
      message,
      code: "validation_error",
      type: "validation_error",
      statusCode: 400,
      details,
    });
  }
}

function typeFromStatus(status: number): AutlanticBillingErrorType {
  if (status === 401 || status === 403) return "authentication_error";
  if (status === 404) return "not_found";
  if (status === 400 || status === 422) return "validation_error";
  if (status === 409) return "idempotency_error";
  return "api_error";
}

function codeFromStatus(status: number): AutlanticBillingErrorCode {
  if (status === 401 || status === 403) return "authentication_error";
  if (status === 404) return "resource_missing";
  if (status === 400 || status === 422) return "validation_error";
  if (status === 409) return "idempotency_error";
  return "api_error";
}

function inferType(
  statusCode: number | undefined,
  code: AutlanticBillingErrorCode,
): AutlanticBillingErrorType {
  if (statusCode != null) return typeFromStatus(statusCode);
  if (code === "authentication_error") return "authentication_error";
  if (code === "configuration_error") return "configuration_error";
  if (code === "validation_error") return "validation_error";
  if (code === "resource_missing") return "not_found";
  if (code.startsWith("webhook_")) return "webhook_error";
  if (code === "idempotency_error") return "idempotency_error";
  return "api_error";
}
