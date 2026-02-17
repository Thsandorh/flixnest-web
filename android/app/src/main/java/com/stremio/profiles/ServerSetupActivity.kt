package com.stremio.profiles

import android.content.Intent
import android.content.SharedPreferences
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.URL

class ServerSetupActivity : AppCompatActivity() {

    private lateinit var prefs: SharedPreferences
    private lateinit var serverUrlInput: EditText
    private lateinit var connectButton: Button
    private lateinit var localButton: Button
    private lateinit var errorText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_server_setup)

        prefs = getSharedPreferences("stremio_profiles", MODE_PRIVATE)

        serverUrlInput = findViewById(R.id.server_url_input)
        connectButton = findViewById(R.id.connect_button)
        localButton = findViewById(R.id.local_button)
        errorText = findViewById(R.id.error_text)

        connectButton.setOnClickListener {
            val url = serverUrlInput.text.toString().trim()
            if (url.isEmpty()) {
                showError("Please enter a server URL")
                return@setOnClickListener
            }
            // Ensure URL starts with http:// or https://
            val normalizedUrl = if (url.startsWith("http://") || url.startsWith("https://")) {
                url
            } else {
                "http://$url"
            }
            // Remove trailing slash
            val cleanUrl = normalizedUrl.trimEnd('/')
            testAndSaveServer(cleanUrl)
        }

        localButton.setOnClickListener {
            testAndSaveServer("http://localhost:8080")
        }
    }

    private fun testAndSaveServer(serverUrl: String) {
        setLoading(true)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                // Test the server by calling the profiles API
                val testUrl = URL("$serverUrl/api/profiles")
                val connection = testUrl.openConnection()
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                connection.connect()

                withContext(Dispatchers.Main) {
                    // Save the server URL
                    prefs.edit()
                        .putString("server_url", serverUrl)
                        .apply()

                    setLoading(false)

                    // Launch main activity
                    val intent = Intent(this@ServerSetupActivity, MainActivity::class.java)
                    startActivity(intent)
                    finish()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    setLoading(false)
                    showError("Cannot connect to server: ${e.message}")
                }
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        connectButton.isEnabled = !loading
        connectButton.text = if (loading) "Connecting..." else "Connect"
        localButton.isEnabled = !loading
    }

    private fun showError(message: String) {
        errorText.text = message
        errorText.visibility = View.VISIBLE
    }
}
