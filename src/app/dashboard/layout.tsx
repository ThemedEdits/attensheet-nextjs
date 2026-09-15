import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Monitor class attendance metrics, active subjects, quick actions, and sync status.",
  alternates: {
    canonical: "/dashboard",
  },
  openGraph: {
    title: "Dashboard | AttenSheet",
    description: "Monitor class attendance metrics, active subjects, quick actions, and sync status.",
    url: "/dashboard",
    images: ["/og-image.png"],
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
