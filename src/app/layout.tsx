import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { AppBottomNav } from "@/components/AppBottomNav";

export const metadata: Metadata = {
  title: "Attensheet — Attendance, without the busywork",
  description: "Modern attendance management for university classes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ToastProvider>{children}<AppBottomNav /></ToastProvider></body></html>;
}
