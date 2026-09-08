package com.autlantic.billing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;

final class ClientTest {
  @Test
  void fromEnvRequiresKey() {
    assertThrows(
        AutlanticBillingException.class, () -> AutlanticBilling.fromEnv(Map.of()));
  }

  @Test
  void modeFromKey() {
    assertEquals("test", AutlanticBilling.billingModeFromApiKey("abk_test_x"));
    assertEquals("live", AutlanticBilling.billingModeFromApiKey("abk_live_x"));
  }

  @Test
  void constructPinsVersionConstants() {
    AutlanticBilling client = new AutlanticBilling("abk_test_demo");
    assertEquals("test", client.getMode());
    assertEquals("0.1.0", Version.SDK_VERSION);
    assertEquals("2026-01-01", Version.AUTLANTIC_API_VERSION);
    assertTrue(Version.USER_AGENT.contains("autlantic-java/"));
  }
}
