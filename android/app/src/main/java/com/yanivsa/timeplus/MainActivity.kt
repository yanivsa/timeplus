package com.yanivsa.timeplus

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    companion object {
        const val PRIMARY_URL = "https://timeplus-app.pages.dev"
        const val FALLBACK_URL = "https://timeplus.yanivsa.workers.dev"
        private val ALLOWED_HOSTS = setOf(
            "timeplus-app.pages.dev",
            "timeplus.yanivsa.workers.dev"
        )
    }

    private lateinit var webView: WebView
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var offlineLayout: LinearLayout
    private lateinit var retryButton: Button

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var activeBaseUrl = PRIMARY_URL
    private var currentPath = "/"
    private var fallbackAttempted = false

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (filePathCallback != null) {
            val results: Array<Uri>? = if (result.resultCode == RESULT_OK && result.data != null) {
                val dataUri = result.data?.data
                val clipData = result.data?.clipData
                if (clipData != null) {
                    Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                } else if (dataUri != null) {
                    arrayOf(dataUri)
                } else null
            } else null

            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout)
        progressBar = findViewById(R.id.progressBar)
        offlineLayout = findViewById(R.id.offlineLayout)
        retryButton = findViewById(R.id.retryButton)

        setupCookies()
        setupWebView()
        setupBackNavigation()
        setupListeners()
        createNotificationChannel()
        requestNotificationPermission()
        setupFirebaseMessaging()

        if (isNetworkAvailable()) {
            showWebView()
            currentPath = targetPathFromIntent(intent)
            loadCurrentPath(preferPrimary = true)
        } else {
            showOfflineView()
        }
    }

    private fun setupCookies() {
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = false
        settings.allowContentAccess = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.userAgentString = settings.userAgentString + " TimePlusApp/1.0.2"
        webView.addJavascriptInterface(NativePushBridge(this), "TimePlusAndroid")

        val isDebuggable = (applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
        WebView.setWebContentsDebuggingEnabled(isDebuggable)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                val host = uri.host

                if (host != null && ALLOWED_HOSTS.any { it.equals(host, ignoreCase = true) }) {
                    return false // Let WebView load it
                }

                // External link: open in system browser
                try {
                    val intent = Intent(Intent.ACTION_VIEW, uri)
                    startActivity(intent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                return true
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                swipeRefreshLayout.isRefreshing = false
                showWebView()
                notifyWebOfFcmToken()
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    val failedUrl = request.url.toString()
                    if (!fallbackAttempted && failedUrl.startsWith(PRIMARY_URL)) {
                        fallbackAttempted = true
                        activeBaseUrl = FALLBACK_URL
                        view?.post { view.loadUrl(buildUrl(activeBaseUrl, currentPath)) }
                    } else {
                        showOfflineView()
                    }
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                if (newProgress >= 100) {
                    progressBar.visibility = View.GONE
                } else {
                    progressBar.visibility = View.VISIBLE
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "image/*"
                }

                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    private fun setupListeners() {
        swipeRefreshLayout.setOnRefreshListener {
            if (isNetworkAvailable()) {
                webView.reload()
            } else {
                swipeRefreshLayout.isRefreshing = false
                showOfflineView()
            }
        }

        retryButton.setOnClickListener {
            if (isNetworkAvailable()) {
                showWebView()
                loadCurrentPath(preferPrimary = true)
            } else {
                showOfflineView()
            }
        }
    }

    private fun showOfflineView() {
        swipeRefreshLayout.visibility = View.GONE
        offlineLayout.visibility = View.VISIBLE
        progressBar.visibility = View.GONE
    }

    private fun showWebView() {
        offlineLayout.visibility = View.GONE
        swipeRefreshLayout.visibility = View.VISIBLE
    }

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager =
            getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    override fun onResume() {
        super.onResume()
        CookieManager.getInstance().flush()
        setupFirebaseMessaging()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (::webView.isInitialized && isNetworkAvailable()) {
            currentPath = targetPathFromIntent(intent)
            loadCurrentPath(preferPrimary = false)
        }
    }



    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                TimePlusFirebaseMessagingService.CHANNEL_ID,
                "Time+ התראות",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "בקשות זמן, אישורים ועדכוני משימות"
                enableVibration(true)
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun requestNotificationPermission() {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun setupFirebaseMessaging() {
        if (FirebaseApp.getApps(this).isEmpty()) return

        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) return@addOnCompleteListener
            val token = task.result ?: return@addOnCompleteListener
            if (token.isBlank()) return@addOnCompleteListener

            getSharedPreferences(TimePlusFirebaseMessagingService.PREFS_NAME, MODE_PRIVATE)
                .edit()
                .putString(TimePlusFirebaseMessagingService.KEY_FCM_TOKEN, token)
                .apply()

            notifyWebOfFcmToken()
        }
    }

    private fun notifyWebOfFcmToken() {
        if (!::webView.isInitialized) return

        val token = getSharedPreferences(TimePlusFirebaseMessagingService.PREFS_NAME, MODE_PRIVATE)
            .getString(TimePlusFirebaseMessagingService.KEY_FCM_TOKEN, null)
            ?: return

        val quotedToken = JSONObject.quote(token)
        webView.post {
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('timeplus:fcm-token',{detail:$quotedToken}));",
                null
            )
        }
    }

    private fun targetPathFromIntent(sourceIntent: Intent?): String {
        val path = (
            sourceIntent?.getStringExtra("notification_url")
                ?: sourceIntent?.getStringExtra("url")
        )?.trim().orEmpty()
        if (path.isBlank() || !path.startsWith("/")) return "/"
        return path
    }

    private fun buildUrl(baseUrl: String, path: String): String {
        return if (path == "/") baseUrl else baseUrl + path
    }

    private fun loadCurrentPath(preferPrimary: Boolean) {
        if (preferPrimary) {
            activeBaseUrl = PRIMARY_URL
            fallbackAttempted = false
        }
        webView.loadUrl(buildUrl(activeBaseUrl, currentPath))
    }

    private class NativePushBridge(private val context: Context) {
        @JavascriptInterface
        fun getFcmToken(): String {
            return context
                .getSharedPreferences(TimePlusFirebaseMessagingService.PREFS_NAME, Context.MODE_PRIVATE)
                .getString(TimePlusFirebaseMessagingService.KEY_FCM_TOKEN, "")
                .orEmpty()
        }

        @JavascriptInterface
        fun getDeviceName(): String {
            return "${Build.MANUFACTURER} ${Build.MODEL}".trim()
        }
    }

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
    }
}
