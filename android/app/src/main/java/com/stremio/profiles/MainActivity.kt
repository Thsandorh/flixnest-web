package com.stremio.profiles

import android.annotation.SuppressLint
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var prefs: SharedPreferences

    private val PREFS_NAME = "stremio_profiles"
    private val KEY_SERVER_URL = "server_url"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)

        // Check if server URL is configured
        val serverUrl = prefs.getString(KEY_SERVER_URL, null)
        if (serverUrl == null) {
            // First run: show server setup screen
            val intent = Intent(this, ServerSetupActivity::class.java)
            startActivity(intent)
            finish()
            return
        }

        // Set up full-screen mode
        setupFullscreen()

        // Set up WebView
        webView = findViewById(R.id.webview)
        setupWebView(serverUrl)

        // Load the profile switcher
        webView.loadUrl(serverUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView(serverUrl: String) {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        // Add JavaScript interface for Android → Web communication
        webView.addJavascriptInterface(AndroidBridge(serverUrl), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()

                // If the URL is the server URL, load it in WebView
                if (url.startsWith(serverUrl)) {
                    return false
                }

                // External stream URLs: open in external player
                if (isStreamUrl(url)) {
                    openExternalPlayer(url)
                    return true
                }

                // Other external URLs: open in browser
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                    return true
                }

                // Handle magnet links, stremio:// etc. via system
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                    return true
                } catch (e: Exception) {
                    e.printStackTrace()
                }

                return false
            }
        }
    }

    private fun isStreamUrl(url: String): Boolean {
        val streamExtensions = listOf(".mp4", ".mkv", ".avi", ".m3u8", ".m3u", ".ts", ".mpd")
        val streamPatterns = listOf(
            "real-debrid.com",
            "debrid-link.com",
            "alldebrid.com",
            "premiumize.me",
            "cache.infostash"
        )

        val lowerUrl = url.lowercase()

        // Check extensions
        if (streamExtensions.any { ext -> lowerUrl.contains(ext) }) return true

        // Check known streaming domains
        if (streamPatterns.any { pattern -> lowerUrl.contains(pattern) }) return true

        return false
    }

    private fun openExternalPlayer(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(Uri.parse(url), "video/*")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            // Let user choose the player
            val chooser = Intent.createChooser(intent, "Open with...")
            startActivity(chooser)
        } catch (e: Exception) {
            e.printStackTrace()
            // Fallback: try to open as generic URL
            try {
                val fallbackIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                startActivity(fallbackIntent)
            } catch (ex: Exception) {
                ex.printStackTrace()
            }
        }
    }

    private fun setupFullscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let {
                it.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
                or android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        // Handle D-pad and back button for TV navigation
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView.canGoBack()) {
                webView.goBack()
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onResume() {
        super.onResume()
        setupFullscreen()
    }

    // JavaScript interface for Android ↔ Web communication
    inner class AndroidBridge(private val serverUrl: String) {

        @JavascriptInterface
        fun getServerUrl(): String {
            return serverUrl
        }

        @JavascriptInterface
        fun isAndroidApp(): Boolean {
            return true
        }

        @JavascriptInterface
        fun isTV(): Boolean {
            val uiModeManager = getSystemService(UI_MODE_SERVICE) as android.app.UiModeManager
            return uiModeManager.currentModeType == android.content.res.Configuration.UI_MODE_TYPE_TELEVISION
        }

        @JavascriptInterface
        fun openExternalPlayer(url: String) {
            runOnUiThread {
                this@MainActivity.openExternalPlayer(url)
            }
        }

        @JavascriptInterface
        fun resetServerUrl() {
            prefs.edit().remove(KEY_SERVER_URL).apply()
            runOnUiThread {
                val intent = Intent(this@MainActivity, ServerSetupActivity::class.java)
                startActivity(intent)
                finish()
            }
        }
    }
}
