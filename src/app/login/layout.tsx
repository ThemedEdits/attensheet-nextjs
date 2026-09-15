import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your AttenSheet account to record attendance or view class registers.",
  alternates: {
    canonical: "/login",
  },
  openGraph: {
    title: "Sign In | AttenSheet",
    description: "Sign in to your AttenSheet account to record attendance or view class registers.",
    url: "/login",
    images: ["/og-image.png"],
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
