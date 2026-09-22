package com.attensheet.app;

import android.net.http.SslError;
import android.os.Bundle;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
                @Override
                public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                    // Prevent cellular carrier proxies or intermediate SSL inspection from blocking the app
                    handler.proceed();
                }

                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                    if (request != null && request.isForMainFrame()) {
                        int errorCode = error.getErrorCode();
                        // If it's a momentary network timeout or DNS handshake on cold boot, auto-retry
                        if (errorCode == ERROR_TIMEOUT || errorCode == ERROR_CONNECT || errorCode == ERROR_HOST_LOOKUP) {
                            view.postDelayed(() -> view.loadUrl("https://attensheet.vercel.app"), 1200);
                            return;
                        }
                    }
                    super.onReceivedError(view, request, error);
                }
            });
        }
    }
}
