"use client";

import { useEffect, useState } from "react";
import { authHeaders } from "@/lib/client-auth";

type RequestItem = { id: string; fullName?: string; teacherUid?: string; studentUid?: string; seatNumber?: string };

export default function RequestsPage() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/requests", { headers: await authHeaders() });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load requests.");
      setItems(result.requests);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load requests.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function decide(item: RequestItem, decision: "approved" | "rejected") {
    try {
      const response = await fetch("/api/requests", {
        method: "PATCH",
        headers: await authHeaders(true),
        body: JSON.stringify({ requestId: item.id, kind: item.teacherUid ? "teacherRequests" : "studentRequests", decision }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update request.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update request.");
    }
  }

  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
    <p className="text-sm text-emerald-400">Class management</p>
    <h1 className="mt-2 text-4xl font-semibold text-white">Join requests</h1>
    {message && <p className="mt-4 text-sm text-rose-200">{message}</p>}
    <div className="mt-8 space-y-3">{items.length ? items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div><p className="font-medium text-white">{item.fullName ?? item.teacherUid}</p><p className="text-xs text-slate-400">{item.studentUid ? `Student${item.seatNumber ? ` · Seat ${item.seatNumber}` : ""}` : "Teacher"}</p></div>
      <div className="flex gap-2"><button onClick={() => void decide(item, "approved")} className="button-primary">Approve</button><button onClick={() => void decide(item, "rejected")} className="button-secondary">Reject</button></div>
    </div>) : <p className="text-slate-400">No pending requests.</p>}</div>
  </main>;
}
