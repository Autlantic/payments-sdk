package com.autlantic.checkout

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent

/**
 * Presents hosted Autlantic checkout (`checkoutUrl` / payment link URL).
 * Never accepts API keys. Create sessions on your server.
 */
object AutlanticCheckout {
  private val ALLOWED_SCHEME = Regex("^(https|http|sandbox)$", RegexOption.IGNORE_CASE)

  /**
   * Opens [checkoutUrl] in Chrome Custom Tabs so WalletConnect can hand off to wallet apps.
   * Configure your app deep link / App Link for return success and cancel URLs,
   * then refresh entitlement from **your** backend after the webhook.
   */
  @JvmStatic
  fun present(context: Context, checkoutUrl: String) {
    val uri = parseCheckoutUrl(checkoutUrl)
    CustomTabsIntent.Builder()
      .setShowTitle(true)
      .build()
      .launchUrl(context, uri)
  }

  /**
   * Validates checkout URL shape without requiring an Android runtime for the
   * scheme check (unit-testable on JVM).
   */
  @JvmStatic
  fun requireValidCheckoutUrl(checkoutUrl: String): String {
    val trimmed = checkoutUrl.trim()
    require(trimmed.isNotEmpty()) { "checkoutUrl must not be empty" }
    val scheme = trimmed.substringBefore("://", missingDelimiterValue = "").lowercase()
    require(scheme.isNotEmpty() && ALLOWED_SCHEME.matches(scheme)) {
      "checkoutUrl must be an http(s) or sandbox URL"
    }
    return trimmed
  }

  /** Parses a validated hosted checkout URL. */
  @JvmStatic
  internal fun parseCheckoutUrl(checkoutUrl: String): Uri {
    return Uri.parse(requireValidCheckoutUrl(checkoutUrl))
  }
}
