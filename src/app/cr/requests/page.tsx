"use client";

import { useEffect, useState } from "react";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";

type RequestItem = { id: string; fullName?: string; teacherUid?: string; studentUid?: string; seatNumber?: string };
type Subject = { id: string; name: string };
type Member = { uid: string; fullName?: string; role: string };

export default function RequestsPage() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [message, setMessage] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [counts, setCounts] = useState({ students: 0, teachers: 0 });
  const [members, setMembers] = useState<Member[]>([]);

  async function load() {
    try {
      const response = await fetch("/api/requests", { headers: await authHeaders() });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Unable to load requests."));
      setItems(Array.isArray(result.requests) ? result.requests as RequestItem[] : []);
      setCounts((result.counts as { students: number; teachers: number } | undefined) ?? { students: 0, teachers: 0 });
      setMembers((result.members as Member[] | undefined) ?? []);
      const first = await fetch(`/api/subjects?classId=${encodeURIComponent(String(result.classId ?? ""))}`, { headers: await authHeaders() });
      if (first.ok) { const data = await first.json(); setSubjects(data.subjects ?? []); }
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
        body: JSON.stringify({ requestId: item.id, kind: item.teacherUid ? "teacherRequests" : "studentRequests", decision, subjectId: item.teacherUid ? (document.querySelector(`select[data-request="${item.id}"]`) as HTMLSelectElement)?.value || undefined : undefined }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Unable to update request."));
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update request.");
    }
  }
  async function assign(subjectId: string, teacherUid: string) {
    const response = await fetch("/api/subjects", { method: "PATCH", headers: await authHeaders(true), body: JSON.stringify({ subjectId, teacherUid: teacherUid || null }) });
    if (!response.ok) { const data = await response.json(); setMessage(data.error ?? "Unable to assign teacher."); }
  }

  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
    <p className="text-sm text-emerald-400">Class management</p>
    <h1 className="mt-2 text-4xl font-semibold text-white">Join requests</h1>
    {message && <p className="mt-4 text-sm text-rose-200">{message}</p>}
    <div className="mt-6 flex gap-4 text-sm text-slate-300"><span>Approved students: {counts.students}</span><span>Approved teachers: {counts.teachers}</span></div><div className="mt-6 space-y-2">{subjects.map((subject) => <div key={subject.id} className="flex items-center justify-between rounded-xl border border-white/10 p-3"><span className="text-white">{subject.name}</span><select className="field mt-0 w-56" onChange={(event) => void assign(subject.id, event.target.value)} defaultValue=""><option value="">Assign approved teacher</option>{members.filter((member) => member.role === "teacher").map((member) => <option key={member.uid} value={member.uid}>{member.fullName ?? member.uid}</option>)}</select></div>)}</div><div className="mt-8 space-y-3">{items.length ? items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.04] p-4">
      <div><p className="font-medium text-white">{item.fullName ?? item.teacherUid}</p><p className="text-xs text-slate-400">{item.studentUid ? `Student${item.seatNumber ? ` · Seat ${item.seatNumber}` : ""}` : "Teacher"}</p>{item.teacherUid && <select data-request={item.id} className="field mt-2" defaultValue=""><option value="">Assign subject (optional)</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>}</div>
      <div className="flex gap-2"><button onClick={() => void decide(item, "approved")} className="button-primary">Approve</button><button onClick={() => void decide(item, "rejected")} className="button-secondary">Reject</button></div>
    </div>) : <p className="text-slate-400">No pending requests.</p>}</div>
  </main>;
}
