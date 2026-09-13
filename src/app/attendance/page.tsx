"use client";

import { useState } from "react";
import { authHeaders } from "@/lib/client-auth";
import { karachiDate } from "@/lib/domain";

export default function AttendancePage() {
  const [date, setDate] = useState(karachiDate());
  const [message, setMessage] = useState("Choose a date to load attendance.");
  const [busy, setBusy] = useState(false);
  const [students, setStudents] = useState<{uid:string;fullName?:string;seatNumber?:string}[]>([]);
  const [records, setRecords] = useState<Record<string, boolean>>({});
  const [canEdit, setCanEdit] = useState(false);
  async function load() {
    const params = new URLSearchParams(window.location.search);
    const classId = params.get("classId");
    const subjectId = params.get("subjectId");
    if (!classId || !subjectId) { setMessage("Choose a subject from your dashboard first."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/attendance?classId=${encodeURIComponent(classId)}&subjectId=${encodeURIComponent(subjectId)}&date=${date}`, { headers: await authHeaders() });
      const result = await response.json();
      if (response.ok) {
        setStudents(result.students ?? []);
        setRecords(Object.fromEntries((result.attendance ?? []).map((item: {studentUid:string;present:boolean}) => [item.studentUid, item.present])));
        setCanEdit(result.canEdit === true);
        setMessage(`${result.attendance.length} attendance records loaded for ${date}.`);
      } else setMessage(result.error ?? "Unable to load attendance.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load attendance.");
    } finally { setBusy(false); }
  }

  async function save() {
    const params = new URLSearchParams(window.location.search); const classId = params.get("classId"); const subjectId = params.get("subjectId");
    if (!classId || !subjectId) return;
    const response = await fetch("/api/attendance", { method: "POST", headers: await authHeaders(true), body: JSON.stringify({ classId, subjectId, date, records: students.map((student) => ({ studentUid: student.uid, present: records[student.uid] === true })) }) });
    const result = await response.json(); setMessage(response.ok ? "Attendance saved." : result.error ?? "Unable to save attendance.");
  }
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-12"><p className="text-sm text-emerald-400">Attendance · Asia/Karachi</p><h1 className="mt-2 text-4xl font-semibold text-white">Daily register</h1><label className="mt-8 block max-w-xs text-sm text-slate-300">Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="field" /></label><p className="mt-6 text-sm text-slate-400">{message}</p><div className="mt-6 flex gap-3"><button disabled={busy} onClick={() => void load()} className="button-primary">{busy ? "Loading..." : "Load attendance"}</button>{canEdit && <button onClick={() => void save()} className="button-secondary">Save register</button>}</div><div className="mt-8 space-y-2">{students.map((student) => <label key={student.uid} className="flex items-center justify-between rounded-lg border border-white/10 p-3 text-white"><span>{student.fullName ?? student.uid}{student.seatNumber && ` · ${student.seatNumber}`}</span><input type="checkbox" disabled={!canEdit} checked={records[student.uid] === true} onChange={(event) => setRecords((current) => ({ ...current, [student.uid]: event.target.checked }))} /></label>)}</div></main>;
}
