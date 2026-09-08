package com.autlantic.billing;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.json.JSONObject;

/**
 * Merchant server client for https://billing.autlantic.com (hosted only).
 */
public final class AutlanticBilling {
  private static final Set<Integer> RETRYABLE_STATUS =
      Set.of(408, 429, 500, 502, 503, 504);
  private static final SecureRandom RANDOM = new SecureRandom();

  private final String apiKey;
  private final String apiBaseUrl;
  private final String merchantId;
  private final double timeoutSec;
  private final int maxRetries;
  private final String mode;
  private final HttpClient httpClient;

  public AutlanticBilling(String apiKey) {
    this(apiKey, "https://billing.autlantic.com", null, 30.0, 2);
  }

  public AutlanticBilling(String apiKey, String apiBaseUrl, String merchantId) {
    this(apiKey, apiBaseUrl, merchantId, 30.0, 2);
  }

  public AutlanticBilling(
      String apiKey,
      String apiBaseUrl,
      String merchantId,
      double timeoutSec,
      int maxRetries) {
    String key = apiKey == null ? "" : apiKey.trim();
    if (key.isEmpty()) {
      throw new AutlanticBillingException("api_key is required", "configuration");
    }
    this.apiKey = key;
    String base =
        apiBaseUrl == null || apiBaseUrl.trim().isEmpty()
            ? "https://billing.autlantic.com"
            : apiBaseUrl.trim();
    while (base.endsWith("/")) {
      base = base.substring(0, base.length() - 1);
    }
    this.apiBaseUrl = base;
    this.merchantId =
        merchantId == null || merchantId.trim().isEmpty() ? null : merchantId.trim();
    this.timeoutSec = timeoutSec;
    this.maxRetries = Math.max(0, maxRetries);
    this.mode = billingModeFromApiKey(this.apiKey);
    this.httpClient =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(Math.max(1, (long) (timeoutSec * 1000))))
            .build();
  }

  public String getApiKey() {
    return apiKey;
  }

  public String getApiBaseUrl() {
    return apiBaseUrl;
  }

  public String getMerchantId() {
    return merchantId;
  }

  public double getTimeoutSec() {
    return timeoutSec;
  }

  public int getMaxRetries() {
    return maxRetries;
  }

  public String getMode() {
    return mode;
  }

  /** Build a client from environment variables. */
  public static AutlanticBilling fromEnv() {
    return fromEnv(System.getenv());
  }

  public static AutlanticBilling fromEnv(Map<String, String> env) {
    Map<String, String> e = env != null ? env : Map.of();
    String apiKey = trimOrEmpty(e.get("AUTLANTIC_BILLING_API_KEY"));
    if (apiKey.isEmpty()) {
      throw new AutlanticBillingException(
          "AUTLANTIC_BILLING_API_KEY is required", "configuration");
    }
    String base = trimOrEmpty(e.get("AUTLANTIC_BILLING_API_URL"));
    if (base.isEmpty()) {
      base = "https://billing.autlantic.com";
    }
    String merchant = trimOrEmpty(e.get("AUTLANTIC_BILLING_MERCHANT_ID"));
    return new AutlanticBilling(apiKey, base, merchant.isEmpty() ? null : merchant);
  }

  public static String billingModeFromApiKey(String apiKey) {
    String key = apiKey == null ? "" : apiKey.trim();
    return key.contains("_live_") ? "live" : "test";
  }

  @SuppressWarnings("unchecked")
  public Map<String, Object> listProducts() {
    return request("GET", "/v1/products", null);
  }

  public Map<String, Object> createSubscription(Map<String, Object> body) {
    return request("POST", "/v1/subscriptions", body);
  }

  public Map<String, Object> getSubscription(String subscriptionId) {
    return request("GET", "/v1/subscriptions/" + enc(subscriptionId), null);
  }

  public Map<String, Object> activateSubscription(String subscriptionId) {
    return request(
        "POST", "/v1/subscriptions/" + enc(subscriptionId) + "/activate", Map.of());
  }

  public Map<String, Object> cancelSubscription(String subscriptionId) {
    return cancelSubscription(subscriptionId, null);
  }

  public Map<String, Object> cancelSubscription(
      String subscriptionId, Map<String, Object> body) {
    return request(
        "POST",
        "/v1/subscriptions/" + enc(subscriptionId) + "/cancel",
        body != null ? body : Map.of());
  }

  public Map<String, Object> createPayment(Map<String, Object> body) {
    return request("POST", "/v1/payments", body);
  }

  public Map<String, Object> getPayment(String paymentId) {
    return request("GET", "/v1/payments/" + enc(paymentId), null);
  }

  public Map<String, Object> createPaymentLink(Map<String, Object> body) {
    return request("POST", "/v1/payment-links", body);
  }

  public Map<String, Object> listPaymentLinks() {
    return request("GET", "/v1/payment-links", null);
  }

  public Map<String, Object> getPaymentLink(String linkId) {
    return request("GET", "/v1/payment-links/" + enc(linkId), null);
  }

  public Map<String, Object> disablePaymentLink(String linkId) {
    return request("POST", "/v1/payment-links/" + enc(linkId) + "/disable", Map.of());
  }

  public Map<String, Object> listInvoices() {
    return listInvoices(null);
  }

  public Map<String, Object> listInvoices(String subscriptionId) {
    String path = "/v1/invoices";
    if (subscriptionId != null && !subscriptionId.isEmpty()) {
      path += "?subscriptionId=" + enc(subscriptionId);
    }
    return request("GET", path, null);
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> request(
      String method, String path, Map<String, Object> body) {
    String requestId =
        "req_"
            + Long.toHexString(System.currentTimeMillis())
            + "_"
            + randomHex(4);
    String url = apiBaseUrl + path;
    String payload = body == null ? null : new JSONObject(body).toString();
    String idemKey = null;
    if ("POST".equals(method)) {
      idemKey = "sdk_" + System.currentTimeMillis() + "_" + randomHex(4);
    }

    int attempts = maxRetries + 1;
    AutlanticBillingException lastError = null;

    for (int attempt = 0; attempt < attempts; attempt++) {
      try {
        HttpRequest.Builder builder =
            HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofMillis(Math.max(1, (long) (timeoutSec * 1000))))
                .header("Accept", "application/json")
                .header("User-Agent", Version.USER_AGENT)
                .header("X-Autlantic-Api-Key", apiKey)
                .header("X-Autlantic-Sdk-Version", Version.SDK_VERSION)
                .header("X-Autlantic-Client-Request-Id", requestId)
                .header("Autlantic-Version", Version.AUTLANTIC_API_VERSION);

        if (payload != null) {
          builder.header("Content-Type", "application/json");
        }
        if (idemKey != null) {
          builder.header("Idempotency-Key", idemKey);
        }

        if ("GET".equals(method)) {
          builder.GET();
        } else if ("POST".equals(method)) {
          builder.POST(
              HttpRequest.BodyPublishers.ofString(
                  payload != null ? payload : "{}", StandardCharsets.UTF_8));
        } else {
          builder.method(
              method,
              payload != null
                  ? HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8)
                  : HttpRequest.BodyPublishers.noBody());
        }

        HttpResponse<String> response =
            httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        int status = response.statusCode();
        String responseBody = response.body() == null ? "" : response.body();

        Object decoded;
        if (responseBody.isEmpty()) {
          decoded = new LinkedHashMap<String, Object>();
        } else {
          try {
            decoded = new JSONObject(responseBody).toMap();
          } catch (Exception e) {
            decoded = responseBody;
          }
        }

        if (status >= 200 && status < 300) {
          if (!(decoded instanceof Map)) {
            throw new AutlanticBillingException(
                "Unexpected response shape", null, status, requestId, decoded);
          }
          return (Map<String, Object>) decoded;
        }

        String message = "HTTP " + status;
        String code = null;
        if (decoded instanceof Map<?, ?> map) {
          Object err = map.get("error");
          if (err != null) {
            message = String.valueOf(err);
          }
          Object c = map.get("code");
          if (c instanceof String) {
            code = (String) c;
          }
        }
        lastError =
            new AutlanticBillingException(message, code, status, requestId, decoded);
        if (RETRYABLE_STATUS.contains(status) && attempt + 1 < attempts) {
          sleepBackoff(attempt);
          continue;
        }
        throw lastError;
      } catch (AutlanticBillingException e) {
        throw e;
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        throw new AutlanticBillingException(
            "Network error: interrupted", "network_error", null, requestId);
      } catch (Exception e) {
        lastError =
            new AutlanticBillingException(
                "Network error: " + e.getMessage(),
                "network_error",
                null,
                requestId);
        if (attempt + 1 < attempts) {
          sleepBackoff(attempt);
          continue;
        }
        throw lastError;
      }
    }

    if (lastError != null) {
      throw lastError;
    }
    throw new AutlanticBillingException("Request failed", "network_error", null, requestId);
  }

  private static void sleepBackoff(int attempt) {
    try {
      Thread.sleep((long) (250 * Math.pow(2, attempt)));
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  private static String enc(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
  }

  private static String trimOrEmpty(String value) {
    return value == null ? "" : value.trim();
  }

  private static String randomHex(int numBytes) {
    byte[] bytes = new byte[numBytes];
    RANDOM.nextBytes(bytes);
    StringBuilder sb = new StringBuilder(numBytes * 2);
    for (byte b : bytes) {
      sb.append(String.format("%02x", b));
    }
    return sb.toString();
  }
}
