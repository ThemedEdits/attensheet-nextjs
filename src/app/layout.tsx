import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { AppBottomNav } from "@/components/AppBottomNav";
import { AppHeader } from "@/components/AppHeader";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AttenSheet — University Attendance Management SaaS",
  description: "Modern dark-themed attendance management for university classes, CRs, teachers, and students.",
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
    title: "Attensheet",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontSans.variable}>
      <head>
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Attensheet" />
        <link rel="manifest" href="/site.webmanifest" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
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
        <ToastProvider>
          <AppHeader />
          <div className="page-shell">
            {children}
          </div>
          <AppBottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}

