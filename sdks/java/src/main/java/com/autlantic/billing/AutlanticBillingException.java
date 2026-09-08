package com.autlantic.billing;

/** Error from Autlantic Billing client configuration or API responses. */
public class AutlanticBillingException extends RuntimeException {
  private final String code;
  private final Integer statusCode;
  private final String requestId;
  private final Object body;

  public AutlanticBillingException(String message) {
    this(message, null, null, null, null);
  }

  public AutlanticBillingException(String message, String code) {
    this(message, code, null, null, null);
  }

  public AutlanticBillingException(String message, String code, Integer statusCode) {
    this(message, code, statusCode, null, null);
  }

  public AutlanticBillingException(
      String message, String code, Integer statusCode, String requestId) {
    this(message, code, statusCode, requestId, null);
  }

  public AutlanticBillingException(
      String message, String code, Integer statusCode, String requestId, Object body) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.body = body;
  }

  public String getCode() {
    return code;
  }

  public Integer getStatusCode() {
    return statusCode;
  }

  public String getRequestId() {
    return requestId;
  }

  public Object getBody() {
    return body;
  }
}
