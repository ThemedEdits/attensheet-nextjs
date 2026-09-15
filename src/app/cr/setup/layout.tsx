import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Class Setup",
  description: "Set up your class, link your Google Sheet, and configure attendance registers.",
  alternates: {
    canonical: "/cr/setup",
  },
  openGraph: {
    title: "Class Setup | AttenSheet",
    description: "Set up your class, link your Google Sheet, and configure attendance registers.",
    url: "/cr/setup",
    images: ["/og-image.png"],
  },
};

export default function CrSetupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
