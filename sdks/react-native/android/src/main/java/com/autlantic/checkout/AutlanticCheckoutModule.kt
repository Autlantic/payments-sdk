package com.autlantic.checkout

import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Opens hosted Autlantic checkout via Chrome Custom Tabs.
 * Deep-link success/cancel URLs are handled by the host app.
 */
class AutlanticCheckoutModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AutlanticCheckout"

  @ReactMethod
  fun present(checkoutUrl: String, returnUrlScheme: String, promise: Promise) {
    // returnUrlScheme kept for API parity with iOS; Android deep links are
    // configured and handled by the host application.
    @Suppress("UNUSED_PARAMETER")
    val ignoredScheme = returnUrlScheme

    if (checkoutUrl.isBlank()) {
      val map = Arguments.createMap()
      map.putString("status", "failed")
      map.putString("error", "checkoutUrl must not be empty")
      promise.resolve(map)
      return
    }

    try {
      val activity = currentActivity
      val context = activity ?: reactContext
      val uri = Uri.parse(checkoutUrl)
      val customTabs =
        CustomTabsIntent.Builder()
          .setShowTitle(true)
          .build()
      if (activity == null) {
        customTabs.intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      customTabs.launchUrl(context, uri)

      val map = Arguments.createMap()
      map.putString("status", "completed")
      promise.resolve(map)
    } catch (e: Exception) {
      val map = Arguments.createMap()
      map.putString("status", "failed")
      map.putString("error", e.message ?: "Failed to open Custom Tabs")
      promise.resolve(map)
    }
  }
}
