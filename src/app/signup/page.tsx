import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-12 sm:px-6">
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[100px]" />
      <AuthForm mode="signup" />
    </main>
  );
}

