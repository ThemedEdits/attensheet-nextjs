package com.attensheet.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            // Enable third-party cookies so Firebase cross-domain auth state is maintained
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

            // Clean User Agent string to prevent Google OAuth from rejecting WebView
            String userAgent = settings.getUserAgentString();
            if (userAgent != null) {
                String cleanUserAgent = userAgent.replace("; wv", "").replaceAll("Version\\/\\d+\\.\\d+\\s*", "");
                settings.setUserAgentString(cleanUserAgent);
            }
        }
    }
}
