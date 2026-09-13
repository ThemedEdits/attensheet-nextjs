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
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontSans.variable}>
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

