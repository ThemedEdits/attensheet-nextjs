import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Students Roster",
  description: "Manage enrolled students, assign secondary CRs, and maintain university class records.",
  alternates: {
    canonical: "/students",
  },
  openGraph: {
    title: "Students Roster | AttenSheet",
    description: "Manage enrolled students, assign secondary CRs, and maintain university class records.",
    url: "/students",
    images: ["/og-image.png"],
  },
};

export default function StudentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
