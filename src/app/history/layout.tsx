import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Attendance History",
  description: "Track and review your university lecture attendance records, presents, absents, and subject-wise percentages.",
  alternates: {
    canonical: "/history",
  },
  openGraph: {
    title: "My Attendance History | AttenSheet",
    description: "Track and review your university lecture attendance records, presents, absents, and subject-wise percentages.",
    url: "/history",
    images: ["/og-image.png"],
  },
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
