import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subjects & Register",
  description: "Manage class subjects, assign teachers, and inspect course attendance registers.",
  alternates: {
    canonical: "/subjects",
  },
  openGraph: {
    title: "Subjects & Register | AttenSheet",
    description: "Manage class subjects, assign teachers, and inspect course attendance registers.",
    url: "/subjects",
    images: ["/og-image.png"],
  },
};

export default function SubjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
