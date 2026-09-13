"use client";

import { useState } from "react";
import { authHeaders } from "@/lib/client-auth";
import { karachiDate } from "@/lib/domain";

export default function AttendancePage() {
  const [date, setDate] = useState(karachiDate());
  const [message, setMessage] = useState("Choose a date to load attendance.");
  const [busy, setBusy] = useState(false);
  async function load() {
    const params = new URLSearchParams(window.location.search);
    const classId = params.get("classId");
    const subjectId = params.get("subjectId");
    if (!classId || !subjectId) { setMessage("Choose a subject from your dashboard first."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/attendance?classId=${encodeURIComponent(classId)}&subjectId=${encodeURIComponent(subjectId)}&date=${date}`, { headers: await authHeaders() });
      const result = await response.json();
      setMessage(response.ok ? `${result.attendance.length} attendance records loaded for ${date}.` : result.error ?? "Unable to load attendance.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load attendance.");
    } finally { setBusy(false); }
  }

  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-12"><p className="text-sm text-emerald-400">Attendance · Asia/Karachi</p><h1 className="mt-2 text-4xl font-semibold text-white">Daily register</h1><label className="mt-8 block max-w-xs text-sm text-slate-300">Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="field" /></label><p className="mt-6 text-sm text-slate-400">{message}</p><button disabled={busy} onClick={() => void load()} className="button-primary mt-6">{busy ? "Loading..." : "Load attendance"}</button></main>;
}
