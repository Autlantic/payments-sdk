package com.autlantic.billing;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.json.JSONObject;

/**
 * Webhook signature helpers matching PHP / Python / Go Autlantic Billing SDKs.
 */
public final class Webhook {
  public static final String SIGNATURE_HEADER = "x-autlantic-signature";
  public static final int TOLERANCE_SEC = 300;

  private Webhook() {}

  /** Result of {@link #verifyDetailed}. */
  public static final class VerifyResult {
    public final boolean ok;
    public final String reason;

    public VerifyResult(boolean ok, String reason) {
      this.ok = ok;
      this.reason = reason;
    }

    public Map<String, Object> toMap() {
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("ok", ok);
      if (reason != null) {
        m.put("reason", reason);
      }
      return m;
    }
  }

  public static String signBody(String secret, String rawBody) {
    return signBody(secret, rawBody, null);
  }

  public static String signBody(String secret, String rawBody, Long timestampSec) {
    long t = timestampSec != null ? timestampSec : (System.currentTimeMillis() / 1000L);
    String v1 = hmacHex(secret, t + "." + rawBody);
    return "t=" + t + ",v1=" + v1;
  }

  public static VerifyResult verifyDetailed(
      String secret, String rawBody, String signatureHeader) {
    return verifyDetailed(secret, rawBody, signatureHeader, TOLERANCE_SEC, null);
  }

  public static VerifyResult verifyDetailed(
      String secret,
      String rawBody,
      String signatureHeader,
      int toleranceSec,
      Long nowSec) {
    if (secret == null || secret.trim().isEmpty()) {
      return new VerifyResult(false, "empty_secret");
    }
    if (signatureHeader == null || signatureHeader.trim().isEmpty()) {
      return new VerifyResult(false, "missing_header");
    }

    String header = signatureHeader.trim();
    long now = nowSec != null ? nowSec : (System.currentTimeMillis() / 1000L);

    if (header.contains("t=") && header.contains("v1=")) {
      Map<String, String> parts = new HashMap<>();
      for (String piece : header.split(",")) {
        int eq = piece.indexOf('=');
        if (eq < 0) {
          continue;
        }
        parts.put(piece.substring(0, eq), piece.substring(eq + 1));
      }
      String tRaw = parts.get("t");
      if (tRaw == null || !tRaw.chars().allMatch(Character::isDigit)) {
        return new VerifyResult(false, "timestamp_invalid");
      }
      long t;
      try {
        t = Long.parseLong(tRaw);
      } catch (NumberFormatException e) {
        return new VerifyResult(false, "timestamp_invalid");
      }
      String v1 = parts.getOrDefault("v1", "").trim();
      if (v1.isEmpty()) {
        return new VerifyResult(false, "timestamp_invalid");
      }
      if (Math.abs(now - t) > toleranceSec) {
        return new VerifyResult(false, "timestamp_expired");
      }
      String expected = hmacHex(secret, t + "." + rawBody);
      if (!safeEqualHex(expected, v1)) {
        return new VerifyResult(false, "invalid_signature");
      }
      return new VerifyResult(true, null);
    }

    String expected = hmacHex(secret, rawBody);
    if (expected.length() != header.length()) {
      return new VerifyResult(false, "length_mismatch");
    }
    if (!safeEqualHex(expected, header)) {
      return new VerifyResult(false, "invalid_signature");
    }
    return new VerifyResult(true, null);
  }

  public static boolean verify(String secret, String rawBody, String signatureHeader) {
    return verify(secret, rawBody, signatureHeader, TOLERANCE_SEC, null);
  }

  public static boolean verify(
      String secret,
      String rawBody,
      String signatureHeader,
      int toleranceSec,
      Long nowSec) {
    return verifyDetailed(secret, rawBody, signatureHeader, toleranceSec, nowSec).ok;
  }

  /** Parse a webhook JSON body into a map, or null if invalid. */
  @SuppressWarnings("unchecked")
  public static Map<String, Object> parseEvent(String rawBody) {
    try {
      JSONObject obj = new JSONObject(rawBody);
      if (!obj.has("type") || !obj.has("data")) {
        return null;
      }
      return obj.toMap();
    } catch (Exception e) {
      return null;
    }
  }

  private static String hmacHex(String secret, String payload) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
      return toHex(digest);
    } catch (Exception e) {
      throw new IllegalStateException("HMAC-SHA256 failed", e);
    }
  }

  private static String toHex(byte[] bytes) {
    StringBuilder sb = new StringBuilder(bytes.length * 2);
    for (byte b : bytes) {
      sb.append(String.format("%02x", b));
    }
    return sb.toString();
  }

  /** Constant-time compare for hex strings (MessageDigest.isEqual on UTF-8 bytes). */
  private static boolean safeEqualHex(String a, String b) {
    if (a == null || b == null) {
      return false;
    }
    byte[] aa = a.getBytes(StandardCharsets.UTF_8);
    byte[] bb = b.getBytes(StandardCharsets.UTF_8);
    return MessageDigest.isEqual(aa, bb);
  }
}
