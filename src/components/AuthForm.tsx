"use client";

import { useState } from "react";
import { GoogleAuthProvider, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const router = useRouter();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [reset, setReset] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (reset) await sendPasswordResetEmail(firebaseAuth, email);
      else if (mode === "login") await signInWithEmailAndPassword(firebaseAuth, email, password);
      else await createUserWithEmailAndPassword(firebaseAuth, email, password);
      if (!reset) router.push("/dashboard");
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "Something went wrong.";
      setError(code.replace("Firebase: ", "").replace(/\s\(auth\/.+\)\.?$/, "."));
    } finally { setBusy(false); }
  }
  async function google() {
    setBusy(true); setError("");
    try { await signInWithPopup(firebaseAuth, new GoogleAuthProvider()); router.push("/dashboard"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Google sign-in failed."); setBusy(false); }
  }
  return <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/20">
    <Link href="/" className="text-sm text-slate-400 hover:text-white">← attensheet</Link>
    <h1 className="mt-8 text-3xl font-semibold text-white">{reset ? "Reset your password" : mode === "login" ? "Welcome back" : "Create your account"}</h1>
    <p className="mt-2 text-sm text-slate-400">{reset ? "We&apos;ll email you a secure reset link." : "Simple attendance management for your class."}</p>
    {error && <div className="mt-5 rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm text-slate-300">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="you@university.edu" /></label>
      {!reset && <label className="block text-sm text-slate-300">Password<input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" placeholder="At least 6 characters" /></label>}
      <button disabled={busy} className="button-primary w-full">{busy ? "Please wait..." : reset ? "Send reset link" : mode === "login" ? "Sign in" : "Create account"}</button>
    </form>
    {!reset && <><div className="my-6 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-white/10" />or<span className="h-px flex-1 bg-white/10" /></div><button disabled={busy} onClick={google} className="button-secondary w-full">Continue with Google</button></>}
    <div className="mt-6 flex justify-between text-sm text-slate-400">{mode === "login" && !reset ? <button onClick={() => setReset(true)} className="hover:text-emerald-300">Forgot password?</button> : <span />}{!reset && <Link href={mode === "login" ? "/signup" : "/login"} className="text-emerald-300 hover:text-emerald-200">{mode === "login" ? "Create account" : "Sign in"}</Link>}</div>
  </div>;
}
