"use client";

import { sendPasswordResetEmail, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { firebaseAuth } from "@/lib/firebase";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import { useToast } from "@/components/ToastProvider";

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ name?: string; email?: string; role?: string }>({});
  const toast = useToast();
  useEffect(() => { const timer = window.setTimeout(() => void (async () => { const response = await fetch("/api/dashboard", { headers: await authHeaders() }); const result = await readApiResponse(response); if (response.ok) setProfile((result.profile ?? {}) as typeof profile); })(), 0); return () => window.clearTimeout(timer); }, []);
  async function resetPassword() { if (!firebaseAuth.currentUser?.email) return; await sendPasswordResetEmail(firebaseAuth, firebaseAuth.currentUser.email); toast("Password reset email sent.", "success"); }
  return <main className="app-page"><div className="app-page-header"><Link href="/dashboard" className="back-link">← Dashboard</Link><p className="eyebrow">Account</p><h1>Settings</h1><p>Manage your account and sign-in preferences.</p></div><section className="settings-card"><div className="settings-row"><span><small>Display name</small><strong>{profile.name ?? "—"}</strong></span></div><div className="settings-row"><span><small>Linked email</small><strong>{profile.email ?? firebaseAuth.currentUser?.email ?? "—"}</strong></span></div><div className="settings-row"><span><small>Role</small><strong className="capitalize">{profile.role ?? "—"}</strong></span></div><div className="settings-actions"><button type="button" onClick={() => void resetPassword()} className="button-secondary">Send password reset</button><button type="button" onClick={() => void signOut(firebaseAuth)} className="button-secondary">Sign out</button></div></section></main>;
}
