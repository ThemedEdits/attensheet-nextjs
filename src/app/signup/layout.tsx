import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create an AttenSheet account to join your university class or manage lecture attendance.",
  alternates: {
    canonical: "/signup",
  },
  openGraph: {
    title: "Create Account | AttenSheet",
    description: "Create an AttenSheet account to join your university class or manage lecture attendance.",
    url: "/signup",
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
    title: "Create Account | AttenSheet",
    description: "Create an AttenSheet account to join your university class or manage lecture attendance.",
    images: ["/og-image.png"],
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
