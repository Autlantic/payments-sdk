package com.autlantic.checkout

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent

/**
 * Presents hosted Autlantic checkout (`checkoutUrl` / payment link URL).
 * Never accepts API keys. Create sessions on your server.
 */
object AutlanticCheckout {
  /**
   * Opens [checkoutUrl] in Chrome Custom Tabs so WalletConnect can hand off to wallet apps.
   * Configure your app deep link / App Link for [returnUrlScheme] success and cancel URLs,
   * then refresh entitlement from **your** backend after the webhook.
   */
  @JvmStatic
  fun present(context: Context, checkoutUrl: String) {
    val uri = Uri.parse(checkoutUrl)
    CustomTabsIntent.Builder()
      .setShowTitle(true)
      .build()
      .launchUrl(context, uri)
  }
}
