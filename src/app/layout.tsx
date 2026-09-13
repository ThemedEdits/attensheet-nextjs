import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "Attensheet — Attendance, without the busywork",
  description: "Modern attendance management for university classes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ToastProvider>{children}</ToastProvider></body></html>;
}
