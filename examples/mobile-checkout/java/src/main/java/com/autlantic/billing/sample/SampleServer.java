package com.autlantic.billing.sample;

import com.autlantic.billing.AutlanticBilling;
import com.autlantic.billing.Webhook;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/**
 * Hosted-mode merchant backend sample for Autlantic mobile Checkout (Java SDK).
 *
 * <pre>
 *   export AUTLANTIC_BILLING_API_KEY=abk_test_…
 *   ./gradlew run
 * </pre>
 *
 * Listens on port 3059.
 */
public final class SampleServer {
  private static final int PORT = 3059;

  public static void main(String[] args) throws Exception {
    String scheme = env("MOBILE_RETURN_SCHEME", "myapp").replaceAll("[:/]+$", "");
    String successUrl = env("MOBILE_SUCCESS_URL", scheme + "://billing/success");
    String cancelUrl = env("MOBILE_CANCEL_URL", scheme + "://billing/cancel");
    String payout =
        env("AUTLANTIC_PAYOUT_ADDRESS_EVM", "0x1111111111111111111111111111111111111111")
            .trim();
    String webhookSecret =
        env("AUTLANTIC_BILLING_WEBHOOK_SECRET", "whsec_mobile_example").trim();
    Path storePath =
        Path.of(
            env(
                "AUTLANTIC_JAVA_SAMPLE_STORE",
                System.getProperty("java.io.tmpdir")
                    + "/autlantic-java-mobile-access.json"));

    HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", PORT), 0);
    server.createContext(
        "/health",
        exchange -> {
          if (!"GET".equals(exchange.getRequestMethod())) {
            json(exchange, 404, Map.of("error", "Not found"));
            return;
          }
          json(
              exchange,
              200,
              Map.of(
                  "ok", true,
                  "mode", "hosted",
                  "sdk", "java",
                  "successUrl", successUrl,
                  "cancelUrl", cancelUrl));
        });

    server.createContext(
        "/api/checkout",
        exchange -> {
          if (!"POST".equals(exchange.getRequestMethod())) {
            json(exchange, 404, Map.of("error", "Not found"));
            return;
          }
          if (System.getenv("AUTLANTIC_BILLING_API_KEY") == null
              || System.getenv("AUTLANTIC_BILLING_API_KEY").isBlank()) {
            json(exchange, 500, Map.of("error", "Set AUTLANTIC_BILLING_API_KEY"));
            return;
          }
          String raw = readBody(exchange);
          JSONObject body = raw.isEmpty() ? new JSONObject() : new JSONObject(raw);
          double amount = body.optDouble("amountUsdc", 20);
          String merchantRef = body.optString("merchantRef", "").trim();
          if (merchantRef.isEmpty()) {
            merchantRef = "mobile_" + System.currentTimeMillis();
          }
          Map<String, Object> access = loadAccess(storePath);
          Map<String, Object> row = new LinkedHashMap<>();
          row.put("active", false);
          row.put("updatedAt", Instant.now().toString());
          row.put("kind", "payment_link");
          access.put(merchantRef, row);
          saveAccess(storePath, access);

          try {
            Map<String, Object> created =
                AutlanticBilling.fromEnv()
                    .createPaymentLink(
                        Map.of(
                            "merchantRefPrefix", merchantRef,
                            "payoutAddressEvm", payout,
                            "amountUsdc", amount,
                            "description", "Mobile checkout demo (Java)",
                            "maxUses", 1,
                            "successUrl", successUrl,
                            "cancelUrl", cancelUrl));
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("kind", "payment_link");
            out.put("merchantRef", merchantRef);
            out.put("checkoutUrl", created.get("url"));
            Object paymentLink = created.get("paymentLink");
            Object paymentLinkId = null;
            if (paymentLink instanceof Map<?, ?> pl) {
              paymentLinkId = pl.get("id");
            }
            out.put("paymentLinkId", paymentLinkId);
            out.put("successUrl", successUrl);
            out.put("cancelUrl", cancelUrl);
            json(exchange, 201, out);
          } catch (Exception e) {
            json(exchange, 502, Map.of("error", e.getMessage()));
          }
        });

    server.createContext(
        "/api/access",
        exchange -> {
          if (!"GET".equals(exchange.getRequestMethod())) {
            json(exchange, 404, Map.of("error", "Not found"));
            return;
          }
          String path = exchange.getRequestURI().getPath();
          String prefix = "/api/access/";
          if (!path.startsWith(prefix) || path.length() <= prefix.length()) {
            json(exchange, 404, Map.of("error", "Not found"));
            return;
          }
          String merchantRef =
              java.net.URLDecoder.decode(
                  path.substring(prefix.length()), StandardCharsets.UTF_8);
          Map<String, Object> access = loadAccess(storePath);
          if (!access.containsKey(merchantRef)) {
            json(exchange, 404, Map.of("error", "Unknown merchantRef"));
            return;
          }
          Map<String, Object> out = new LinkedHashMap<>();
          out.put("merchantRef", merchantRef);
          Object row = access.get(merchantRef);
          if (row instanceof Map<?, ?> m) {
            for (Map.Entry<?, ?> e : m.entrySet()) {
              out.put(String.valueOf(e.getKey()), e.getValue());
            }
          }
          json(exchange, 200, out);
        });

    server.createContext(
        "/webhooks/autlantic",
        exchange -> {
          if (!"POST".equals(exchange.getRequestMethod())) {
            json(exchange, 404, Map.of("error", "Not found"));
            return;
          }
          String raw = readBody(exchange);
          String sig = exchange.getRequestHeaders().getFirst("X-Autlantic-Signature");
          if (!Webhook.verify(webhookSecret, raw, sig)) {
            json(exchange, 400, Map.of("error", "bad signature"));
            return;
          }
          Map<String, Object> event = Webhook.parseEvent(raw);
          if (event == null) {
            json(exchange, 400, Map.of("error", "bad body"));
            return;
          }
          Object dataObj = event.get("data");
          Map<?, ?> data = dataObj instanceof Map<?, ?> m ? m : Map.of();
          Object merchantRefObj = data.get("merchantRef");
          if (merchantRefObj == null) {
            merchantRefObj = data.get("merchant_ref");
          }
          Object type = event.get("type");
          if (merchantRefObj instanceof String merchantRef
              && !merchantRef.isEmpty()
              && type instanceof String typeStr
              && List.of("invoice.paid", "payment.paid", "subscription.activated")
                  .contains(typeStr)) {
            Map<String, Object> access = loadAccess(storePath);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("active", true);
            row.put("updatedAt", Instant.now().toString());
            row.put("kind", typeStr);
            access.put(merchantRef, row);
            saveAccess(storePath, access);
          }
          Map<String, Object> out = new LinkedHashMap<>();
          out.put("received", true);
          out.put("type", type);
          json(exchange, 200, out);
        });

    server.setExecutor(Executors.newCachedThreadPool());
    server.start();
    System.out.println("Autlantic Java sample listening on http://0.0.0.0:" + PORT);
  }

  private static String env(String key, String fallback) {
    String v = System.getenv(key);
    return v == null || v.isEmpty() ? fallback : v;
  }

  private static String readBody(HttpExchange exchange) throws IOException {
    try (InputStream in = exchange.getRequestBody()) {
      return new String(in.readAllBytes(), StandardCharsets.UTF_8);
    }
  }

  private static void json(HttpExchange exchange, int status, Map<String, ?> body)
      throws IOException {
    byte[] bytes = new JSONObject(body).toString().getBytes(StandardCharsets.UTF_8);
    exchange.getResponseHeaders().set("Content-Type", "application/json");
    exchange.sendResponseHeaders(status, bytes.length);
    try (OutputStream out = exchange.getResponseBody()) {
      out.write(bytes);
    }
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> loadAccess(Path path) {
    try {
      if (!Files.isRegularFile(path)) {
        return new LinkedHashMap<>();
      }
      String raw = Files.readString(path);
      return new LinkedHashMap<>(new JSONObject(raw).toMap());
    } catch (Exception e) {
      return new LinkedHashMap<>();
    }
  }

  private static void saveAccess(Path path, Map<String, Object> rows) throws IOException {
    Files.writeString(path, new JSONObject(rows).toString(2));
  }
}
