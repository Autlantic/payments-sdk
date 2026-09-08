package com.autlantic.checkout.sample

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.autlantic.checkout.AutlanticCheckout
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Sample host for Autlantic Checkout.
 *
 * Emulator → http://10.0.2.2:3055 (host machine loopback)
 * Device → http://YOUR_LAN_IP:3055 with `pnpm example:mobile` running
 */
class MainActivity : AppCompatActivity() {
  private val backendBase =
    System.getenv("AUTLANTIC_SAMPLE_BACKEND") ?: "http://10.0.2.2:3055"
  private var merchantRef: String? = null
  private lateinit var status: TextView

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    status = TextView(this).apply {
      text = "Ready · backend $backendBase"
      textSize = 16f
    }
    val pay = Button(this).apply { text = "Pay with Autlantic" }
    pay.setOnClickListener { startCheckout() }
    setContentView(
      LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(48, 48, 48, 48)
        addView(status)
        addView(pay)
      },
    )
    handleReturnIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    handleReturnIntent(intent)
  }

  private fun handleReturnIntent(intent: Intent?) {
    val data = intent?.data ?: return
    if (data.scheme == "myapp" && data.host == "billing") {
      status.text = "Returned (${data.path}). Checking access…"
      pollAccess()
    }
  }

  private fun startCheckout() {
    status.text = "Creating session…"
    thread {
      try {
        val conn =
          (URL("$backendBase/api/checkout").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            doOutput = true
            outputStream.use {
              it.write("""{"kind":"payment_link","amountUsdc":20}""".toByteArray())
            }
          }
        val body = conn.inputStream.bufferedReader().readText()
        val json = JSONObject(body)
        val checkoutUrl = json.getString("checkoutUrl")
        merchantRef = json.getString("merchantRef")
        runOnUiThread {
          status.text = "Opening checkout…"
          AutlanticCheckout.present(this, checkoutUrl)
        }
      } catch (e: Exception) {
        runOnUiThread { status.text = e.message ?: "Checkout failed" }
      }
    }
  }

  private fun pollAccess() {
    val ref = merchantRef ?: return
    thread {
      try {
        val body = URL("$backendBase/api/access/$ref").readText()
        val active = JSONObject(body).optBoolean("active", false)
        runOnUiThread {
          status.text = if (active) "Access granted" else "Waiting for webhook…"
          if (!active) {
            status.postDelayed({ pollAccess() }, 2000)
          }
        }
      } catch (e: Exception) {
        runOnUiThread { status.text = e.message ?: "Access poll failed" }
      }
    }
  }
}
