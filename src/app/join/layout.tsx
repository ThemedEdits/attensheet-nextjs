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
    images: ["/og-image.png"],
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
