import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mark Attendance",
  description: "Record university lecture attendance with one-tap roll call and instant Google Sheets sync.",
  alternates: {
    canonical: "/attendance",
  },
  openGraph: {
    title: "Mark Attendance | AttenSheet",
    description: "Record university lecture attendance with one-tap roll call and instant Google Sheets sync.",
    url: "/attendance",
    images: ["/og-image.png"],
  },
};

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
