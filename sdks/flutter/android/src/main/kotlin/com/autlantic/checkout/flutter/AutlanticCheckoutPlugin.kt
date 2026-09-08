package com.autlantic.checkout.flutter

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.MethodChannel.MethodCallHandler
import io.flutter.plugin.common.MethodChannel.Result

/**
 * Flutter plugin: opens hosted Autlantic checkout via Chrome Custom Tabs.
 * Deep-link success/cancel URLs are handled by the host app.
 */
class AutlanticCheckoutPlugin : FlutterPlugin, MethodCallHandler {
  private lateinit var channel: MethodChannel
  private var appContext: Context? = null

  override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    appContext = binding.applicationContext
    channel = MethodChannel(binding.binaryMessenger, "com.autlantic.checkout/flutter")
    channel.setMethodCallHandler(this)
  }

  override fun onMethodCall(call: MethodCall, result: Result) {
    when (call.method) {
      "present" -> {
        val checkoutUrl = call.argument<String>("checkoutUrl")
        // returnUrlScheme is accepted for API parity with iOS; Android deep links
        // are configured and handled by the host application.
        @Suppress("UNUSED_VARIABLE")
        val returnUrlScheme = call.argument<String>("returnUrlScheme")
        if (checkoutUrl.isNullOrBlank()) {
          result.success(
            mapOf(
              "status" to "failed",
              "message" to "checkoutUrl is required",
            ),
          )
          return
        }
        present(checkoutUrl, result)
      }
      else -> result.notImplemented()
    }
  }

  private fun present(checkoutUrl: String, result: Result) {
    val context = appContext
    if (context == null) {
      result.success(
        mapOf(
          "status" to "failed",
          "message" to "Plugin not attached to an engine",
        ),
      )
      return
    }

    try {
      val uri = Uri.parse(checkoutUrl)
      val intent =
        CustomTabsIntent.Builder()
          .setShowTitle(true)
          .build()
      intent.intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
      intent.launchUrl(context, uri)
      // Custom Tabs does not return a session callback; host app deep links
      // handle success/cancel after the customer returns.
      result.success(mapOf("status" to "completed"))
    } catch (e: Exception) {
      result.success(
        mapOf(
          "status" to "failed",
          "message" to (e.message ?: "Failed to open Custom Tabs"),
        ),
      )
    }
  }

  override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    channel.setMethodCallHandler(null)
    appContext = null
  }
}
