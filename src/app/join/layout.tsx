import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Class",
  description: "Join your university batch or section using your class enrollment code.",
  alternates: {
    canonical: "/join",
  },
  openGraph: {
    title: "Join Class | AttenSheet",
    description: "Join your university batch or section using your class enrollment code.",
    url: "/join",
    siteName: "AttenSheet",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AttenSheet University Attendance Platform",
        type: "image/png",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Join Class | AttenSheet",
    description: "Join your university batch or section using your class enrollment code.",
    images: ["/og-image.png"],
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
