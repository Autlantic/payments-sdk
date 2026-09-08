package com.autlantic.billing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;

final class WebhookTest {
  @Test
  void signAndVerifyTimestamped() {
    String body = "{\"type\":\"invoice.paid\",\"data\":{}}";
    String sig = Webhook.signBody("whsec_test", body, 1_700_000_000L);
    assertTrue(
        Webhook.verify("whsec_test", body, sig, Webhook.TOLERANCE_SEC, 1_700_000_000L));
  }

  @Test
  void rejectsExpired() {
    String body = "{\"type\":\"invoice.paid\",\"data\":{}}";
    String sig = Webhook.signBody("whsec_test", body, 1_700_000_000L);
    Webhook.VerifyResult result =
        Webhook.verifyDetailed(
            "whsec_test", body, sig, Webhook.TOLERANCE_SEC, 1_700_000_000L + 301);
    assertFalse(result.ok);
    assertEquals("timestamp_expired", result.reason);
  }

  @Test
  void parseEvent() {
    String raw = "{\"type\":\"invoice.paid\",\"id\":\"evt_1\",\"data\":{\"id\":\"in_1\"}}";
    Map<String, Object> event = Webhook.parseEvent(raw);
    assertNotNull(event);
    assertEquals("invoice.paid", event.get("type"));
  }
}
