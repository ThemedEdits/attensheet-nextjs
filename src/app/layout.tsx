import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Attensheet — Attendance, without the busywork",
  description: "Modern attendance management for university classes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
