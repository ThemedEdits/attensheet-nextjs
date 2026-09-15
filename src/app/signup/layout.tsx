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
    images: ["/og-image.png"],
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
