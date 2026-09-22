import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { AppBottomNav } from "@/components/AppBottomNav";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { AppSplashScreen } from "@/components/AppSplashScreen";
import { NetworkStatusProvider } from "@/components/NetworkStatusProvider";
import { InstallAppBanner } from "@/components/InstallAppBanner";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://attensheet.vercel.app"),
  title: {
    default: "AttenSheet | University Attendance Management SaaS",
    template: "%s | AttenSheet",
  },
  description: "Modern attendance management system for university classes, CRs, teachers, and students with Google Sheets integration.",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "AttenSheet",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "AttenSheet | University Attendance Management",
    description: "Manage university classes, record attendance, and sync registers directly with Google Sheets.",
    url: "/",
    siteName: "AttenSheet",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AttenSheet University Attendance Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AttenSheet | University Attendance Management",
    description: "Manage university classes, record attendance, and sync registers directly with Google Sheets.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#07110d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontSans.variable}>
      <head>
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="application-name" content="AttenSheet" />
        <meta name="apple-mobile-web-app-title" content="AttenSheet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/site.webmanifest" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  // Register Service Worker only for browser PWA, prevent WebView interference in native app
                  if ('serviceWorker' in navigator) {
                    var isCap = Boolean(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
                    if (isCap) {
                      navigator.serviceWorker.getRegistrations().then(function(regs) {
                        for (var i = 0; i < regs.length; i++) {
                          regs[i].unregister();
                        }
                      });
                    } else {
                      window.addEventListener('load', function() {
                        navigator.serviceWorker.register('/sw.js').catch(function(err) {
                          console.warn('SW registration failed:', err);
                        });
                      });
                    }
                  }

                  // Error boundary suppression for third-party extensions
                  window.addEventListener('error', function(e) {
                    if (e && e.message && e.message.indexOf("startTime") !== -1) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }, true);
                  window.addEventListener('unhandledrejection', function(e) {
                    if (e && e.reason && e.reason.message && e.reason.message.indexOf("startTime") !== -1) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }, true);
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen text-[var(--text-primary)]">
        <NetworkStatusProvider>
          <ToastProvider>
            <AppSplashScreen />
            <AppHeader />
            <div className="page-shell">
              {children}
              <AppFooter />
            </div>
            <AppBottomNav />
            <InstallAppBanner />
          </ToastProvider>
        </NetworkStatusProvider>
      </body>
    </html>
  );
}

