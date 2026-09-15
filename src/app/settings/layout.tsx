import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure class settings, academic terms, and account preferences.",
  alternates: {
    canonical: "/settings",
  },
  openGraph: {
    title: "Settings | AttenSheet",
    description: "Configure class settings, academic terms, and account preferences.",
    url: "/settings",
    images: ["/og-image.png"],
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
