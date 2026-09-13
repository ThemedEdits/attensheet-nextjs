"use client";
import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
type RequestItem = { id: string; kind?: string; fullName?: string; teacherUid?: string; studentUid?: string };
export default function RequestsPage() {
  const [items, setItems] = useState<RequestItem[]>([]);
  async function load() { const user = firebaseAuth.currentUser; if (!user) return; const r = await fetch("/api/requests", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } }); if (r.ok) setItems(await r.json().then((x) => x.requests)); }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);
  async function decide(item: RequestItem, decision: string) { const user = firebaseAuth.currentUser; if (!user) return; await fetch("/api/requests", { method: "PATCH", headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ requestId: item.id, kind: item.teacherUid ? "teacherRequests" : "studentRequests", decision }) }); load(); }
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-12"><p className="text-sm text-emerald-400">Class management</p><h1 className="mt-2 text-4xl font-semibold text-white">Join requests</h1><div className="mt-8 space-y-3">{items.length ? items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-4"><div><p className="font-medium text-white">{item.fullName ?? item.teacherUid}</p><p className="text-xs text-slate-400">{item.studentUid ? "Student" : "Teacher"}</p></div><div className="flex gap-2"><button onClick={() => decide(item, "approved")} className="button-primary">Approve</button><button onClick={() => decide(item, "rejected")} className="button-secondary">Reject</button></div></div>) : <p className="text-slate-400">No pending requests.</p>}</div></main>;
}
