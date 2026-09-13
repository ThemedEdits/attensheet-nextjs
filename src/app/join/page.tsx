"use client";
import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
export default function JoinPage() {
  const [code, setCode] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage("");
    const user = firebaseAuth.currentUser; if (!user) { setMessage("Please sign in first."); setBusy(false); return; }
    const data = Object.fromEntries(new FormData(e.currentTarget)); const token = await user.getIdToken();
    const response = await fetch("/api/class/join", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const result = await response.json(); setMessage(response.ok ? "Request submitted. A class representative must approve it." : result.error ?? "Unable to join."); setBusy(false);
  }
  return <main className="mx-auto min-h-screen max-w-xl px-6 py-12"><p className="text-sm text-emerald-400">Join a class</p><h1 className="mt-2 text-4xl font-semibold text-white">Enter your class code</h1><form onSubmit={submit} className="mt-8 space-y-4"><input name="classCode" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="field text-center tracking-widest" placeholder="ABCD-2345" maxLength={9} /> <input name="fullName" required className="field" placeholder="Full name" /><input name="fatherName" className="field" placeholder="Father name (students)" /><input name="seatNumber" className="field" placeholder="Seat number (students)" />{message && <p className="text-sm text-slate-300">{message}</p>}<button disabled={busy} className="button-primary w-full">{busy ? "Sending..." : "Request to join"}</button></form></main>;
}
