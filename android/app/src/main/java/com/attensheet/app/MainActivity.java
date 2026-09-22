package com.attensheet.app;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private static final String APP_URL = "https://attensheet.vercel.app";
    private static final String OFFLINE_URL = "file:///android_asset/public/offline.html";

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        if (webView == null) return;

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Customize User Agent: Remove "; wv" and "Version/4.0" so Google OAuth allows sign-in
        String originalUA = settings.getUserAgentString();
        final String cleanUA = (originalUA != null)
            ? originalUA.replace("; wv", "").replaceAll("Version\\/\\d+\\.\\d+\\s*", "") + " AttenSheetApp/1.0"
            : "AttenSheetApp/1.0";
        settings.setUserAgentString(cleanUA);

        // Enable Cookies including third-party cookies (essential for Firebase Auth state)
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Hardware Back Button navigation
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });

        // Setup WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null || request.getUrl() == null) return false;
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                String host = uri.getHost();

                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    if (host != null) {
                        String lowerHost = host.toLowerCase();
                        if (lowerHost.equals("attensheet.vercel.app") ||
                            lowerHost.endsWith(".vercel.app") ||
                            lowerHost.endsWith(".firebaseapp.com") ||
                            lowerHost.endsWith(".google.com") ||
                            lowerHost.endsWith(".googleapis.com") ||
                            lowerHost.equals("accounts.google.com")) {
                            return false; // Stay inside this WebView
                        }
                    }
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(intent);
                        return true;
                    } catch (Exception ignored) {
                        return false;
                    }
                } else if ("whatsapp".equalsIgnoreCase(scheme) || "tel".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme) || "intent".equalsIgnoreCase(scheme)) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(intent);
                        return true;
                    } catch (Exception ignored) {
                        return true;
                    }
                }
                return false;
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                // Prevent carrier proxies from blocking app connection
                handler.proceed();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request != null && request.isForMainFrame()) {
                    // Do NOT call super.onReceivedError! That renders Chromium's "This page couldn't load" screen.
                    // Instead, load our clean offline fallback page.
                    view.loadUrl(OFFLINE_URL);
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript("window.isAttenSheetNative = true;", null);
            }
        });

        // Setup WebChromeClient with OAuth popup window support
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView popupWebView = new WebView(MainActivity.this);
                WebSettings popupSettings = popupWebView.getSettings();
                popupSettings.setJavaScriptEnabled(true);
                popupSettings.setDomStorageEnabled(true);
                popupSettings.setSupportMultipleWindows(true);
                popupSettings.setJavaScriptCanOpenWindowsAutomatically(true);
                popupSettings.setUserAgentString(cleanUA);

                CookieManager.getInstance().setAcceptCookie(true);
                CookieManager.getInstance().setAcceptThirdPartyCookies(popupWebView, true);

                Dialog popupDialog = new Dialog(MainActivity.this, android.R.style.Theme_Black_NoTitleBar_Fullscreen);
                popupDialog.setContentView(popupWebView);
                popupDialog.show();

                popupWebView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onCloseWindow(WebView window) {
                        try {
                            popupDialog.dismiss();
                        } catch (Exception ignored) {}
                    }
                });

                popupWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView pView, WebResourceRequest pRequest) {
                        if (pRequest == null || pRequest.getUrl() == null) return false;
                        String pUrl = pRequest.getUrl().toString();
                        if (pUrl.startsWith(APP_URL) || pUrl.contains("/__/auth/handler")) {
                            try {
                                popupDialog.dismiss();
                            } catch (Exception ignored) {}
                            webView.loadUrl(pUrl);
                            return true;
                        }
                        return false;
                    }

                    @Override
                    public void onReceivedSslError(WebView pView, SslErrorHandler pHandler, SslError pError) {
                        pHandler.proceed();
                    }
                });

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popupWebView);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                try {
                    Intent intent = fileChooserParams.createIntent();
                    startActivityForResult(intent, 1001);
                    return true;
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
            }
        });

        // Check network connectivity and load appropriate URL
        if (!isNetworkAvailable()) {
            webView.loadUrl(OFFLINE_URL);
        } else {
            webView.loadUrl(APP_URL);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 1001) {
            if (filePathCallback != null) {
                Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        }
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Network network = cm.getActiveNetwork();
            if (network == null) return false;
            NetworkCapabilities cap = cm.getNetworkCapabilities(network);
            return cap != null && (
                cap.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                cap.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                cap.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
            );
        } else {
            NetworkInfo info = cm.getActiveNetworkInfo();
            return info != null && info.isConnected();
        }
    }
}
