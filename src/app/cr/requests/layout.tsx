import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Requests",
  description: "Review and approve student and teacher join requests for your class.",
  alternates: {
    canonical: "/cr/requests",
  },
  openGraph: {
    title: "Join Requests | AttenSheet",
    description: "Review and approve student and teacher join requests for your class.",
    url: "/cr/requests",
    images: ["/og-image.png"],
  },
};

export default function CrRequestsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
