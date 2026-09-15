"use client";

import { useEffect, useState } from "react";
import { 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  onAuthStateChanged,
  sendEmailVerification,
  applyActionCode,
  signOut
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, AlertCircle, Loader2, Mail, CheckCircle2 } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reset, setReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        if (user.emailVerified) {
          router.replace("/dashboard");
        } else if (mode === "signup" || verificationPending) {
          setVerificationPending(true);
        }
      }
    });
  }, [router, mode, verificationPending]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = window.setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [resendTimer]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (reset) {
        await sendPasswordResetEmail(firebaseAuth, email);
        setResetSent(true);
      } else if (mode === "login") {
        const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
        if (!cred.user.emailVerified) {
          await sendEmailVerification(cred.user);
          setVerificationPending(true);
          setResendTimer(60);
          setError("Your email address is not verified yet. We have sent a confirmation link to your email.");
          return;
        }
        router.push("/dashboard");
      } else {
        const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        await sendEmailVerification(cred.user);
        setVerificationPending(true);
        setResendTimer(60);
      }
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "Something went wrong.";
      setError(code.replace("Firebase: ", "").replace(/\s\(auth\/.+\)\.?$/, "."));
    } finally {
      setBusy(false);
    }
  }

  async function verifyWithCode(event: React.FormEvent) {
    event.preventDefault();
    if (!verificationCode.trim()) return;
    setVerifying(true);
    setError("");
    try {
      let code = verificationCode.trim();
      if (code.includes("oobCode=")) {
        const params = new URLSearchParams(code.split("?")[1] || code);
        const extracted = params.get("oobCode");
        if (extracted) code = extracted;
      }
      await applyActionCode(firebaseAuth, code);
      await firebaseAuth.currentUser?.reload();
      setVerificationSuccess(true);
      setTimeout(() => {
        router.replace("/dashboard");
      }, 1000);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Invalid or expired verification code.";
      setError(msg.replace("Firebase: ", "").replace(/\s\(auth\/.+\)\.?$/, "."));
    } finally {
      setVerifying(false);
    }
  }

  async function checkVerificationStatus() {
    setVerifying(true);
    setError("");
    try {
      await firebaseAuth.currentUser?.reload();
      if (firebaseAuth.currentUser?.emailVerified) {
        setVerificationSuccess(true);
        setTimeout(() => {
          router.replace("/dashboard");
        }, 1000);
      } else {
        setError("Email not verified yet. Please check your inbox and click the link, or enter the code above.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to check verification status.");
    } finally {
      setVerifying(false);
    }
  }

  async function resendVerification() {
    if (resendTimer > 0) return;
    setBusy(true);
    setError("");
    try {
      if (firebaseAuth.currentUser) {
        await sendEmailVerification(firebaseAuth.currentUser);
        setResendTimer(60);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to resend verification email.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError("");
    try {
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      router.push("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
      {/* Brand & Back Link */}
      <div className="flex items-center justify-between">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to home</span>
        </Link>
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-sm">
          <img 
            src="/attensheetlogo.svg" 
            alt="AttenSheet" 
            className="h-6 w-auto object-contain" 
          />
          <span className="text-[var(--text-primary)]">
            Atten<span className="text-[var(--accent)]">Sheet</span>
          </span>
        </div>
      </div>

      {verificationPending ? (
        <div className="mt-8 space-y-6">
          <div className="text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-soft)] border border-[var(--border-hover)] text-[var(--accent)]">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
              Verify your email address
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              We sent a verification email to <span className="font-semibold text-white">{email || firebaseAuth.currentUser?.email}</span>.
              Follow the link in that email or paste the verification code below to activate your account.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 flex-none text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {verificationSuccess && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--border-hover)] bg-[var(--accent-soft)] p-3.5 text-xs text-[var(--accent)] font-semibold">
              <CheckCircle2 className="h-4 w-4 flex-none text-[var(--accent)] mt-0.5" />
              <span>Email verified successfully! Redirecting to workspace...</span>
            </div>
          )}

          <form onSubmit={verifyWithCode} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Verification Code / Link
              </label>
              <input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="field mt-1.5 font-mono text-xs"
                placeholder="Paste code or link from email"
              />
            </div>
            <button
              type="submit"
              disabled={verifying || !verificationCode.trim()}
              className="button-primary w-full py-2.5 text-xs"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify Code & Continue</span>
              )}
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <span className="h-px w-full bg-[var(--border)]" />
            <span className="absolute bg-[var(--surface)] px-2 text-[11px] text-[var(--text-muted)]">
              or
            </span>
          </div>

          <button
            type="button"
            disabled={verifying}
            onClick={checkVerificationStatus}
            className="button-secondary w-full py-2.5 text-xs"
          >
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking status...</span>
              </>
            ) : (
              <span>I already clicked the link in my email</span>
            )}
          </button>

          <div className="flex items-center justify-between text-xs pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              disabled={resendTimer > 0 || busy}
              onClick={resendVerification}
              className="text-[var(--accent)] hover:underline disabled:text-[var(--text-muted)] disabled:no-underline font-medium"
            >
              {resendTimer > 0 ? `Resend email in ${resendTimer}s` : "Resend verification email"}
            </button>

            <button
              type="button"
              onClick={async () => {
                await signOut(firebaseAuth);
                setVerificationPending(false);
                setError("");
              }}
              className="text-[var(--text-secondary)] hover:text-white"
            >
              Switch account
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {reset ? "Reset password" : mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)]">
              {reset
                ? "Enter your university email to receive a password recovery link."
                : mode === "login"
                ? "Sign in to manage and record your class attendance."
                : "Get started in seconds with university class attendance."}
            </p>
          </div>

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs sm:text-sm text-red-200">
              <AlertCircle className="h-4 w-4 flex-none text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resetSent && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[var(--border-hover)] bg-[var(--accent-soft)] p-3.5 text-xs sm:text-sm text-[var(--accent)]">
              <span>Password reset email sent! Check your inbox and follow the link.</span>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Email address
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field mt-1.5"
                placeholder="name@university.edu"
              />
            </div>

            {!reset && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Password
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => { setReset(true); setError(""); }}
                      className="text-xs text-[var(--accent)] transition hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative mt-1.5">
                  <input
                    required
                    minLength={6}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((curr) => !curr)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <button disabled={busy} className="button-primary mt-2 w-full">
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Please wait...</span>
                </>
              ) : reset ? (
                "Send reset link"
              ) : mode === "login" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          {!reset && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="h-px flex-1 bg-[var(--border)]" />
                <span>or continue with</span>
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={google}
                className="button-secondary w-full"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>
            </>
          )}

          {/* Switch between Login, Signup, Reset */}
          <div className="mt-6 flex items-center justify-between text-xs text-[var(--text-secondary)]">
            {reset ? (
              <button
                type="button"
                onClick={() => { setReset(false); setError(""); setResetSent(false); }}
                className="text-[var(--accent)] hover:underline"
              >
                ← Back to sign in
              </button>
            ) : (
              <>
                <span>
                  {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                </span>
                <Link
                  href={mode === "login" ? "/signup" : "/login"}
                  className="font-semibold text-[var(--accent)] hover:text-[var(--primary-hover)] hover:underline"
                >
                  {mode === "login" ? "Create one" : "Sign in"}
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

