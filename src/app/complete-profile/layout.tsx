import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Complete Profile",
  description: "Set up your student or teacher profile to access your university class register.",
  alternates: {
    canonical: "/complete-profile",
  },
  openGraph: {
    title: "Complete Profile | AttenSheet",
    description: "Set up your student or teacher profile to access your university class register.",
    url: "/complete-profile",
    images: ["/og-image.png"],
  },
};

export default function CompleteProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
