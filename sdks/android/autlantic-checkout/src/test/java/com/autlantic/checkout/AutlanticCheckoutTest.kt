package com.autlantic.checkout

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class AutlanticCheckoutTest {
  @Test
  fun requireValidCheckoutUrl_acceptsHttps() {
    val url = "https://billing.autlantic.com/checkout/pay/pay_x"
    assertEquals(url, AutlanticCheckout.requireValidCheckoutUrl(url))
  }

  @Test
  fun requireValidCheckoutUrl_acceptsSandbox() {
    val url = "sandbox://link/abc"
    assertEquals(url, AutlanticCheckout.requireValidCheckoutUrl(url))
  }

  @Test
  fun requireValidCheckoutUrl_rejectsBlank() {
    assertThrows(IllegalArgumentException::class.java) {
      AutlanticCheckout.requireValidCheckoutUrl("  ")
    }
  }

  @Test
  fun requireValidCheckoutUrl_rejectsNonHttp() {
    assertThrows(IllegalArgumentException::class.java) {
      AutlanticCheckout.requireValidCheckoutUrl("javascript:alert(1)")
    }
  }
}
