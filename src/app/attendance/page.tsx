"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import { karachiDate } from "@/lib/domain";
import { ActionModal } from "@/components/ActionModal";
import { useToast } from "@/components/ToastProvider";

type Student = { uid: string; fullName?: string; fatherName?: string; seatNumber?: string };
type Attendance = { studentUid: string; date: string; present: boolean };
type ClassData = { university?: string; department?: string; className?: string; section?: string; semester?: string };

export default function AttendancePage() {
  const [date, setDate] = useState(karachiDate());
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [records, setRecords] = useState<Record<string, boolean>>({});
  const [subjectName, setSubjectName] = useState("Attendance");
  const [classData, setClassData] = useState<ClassData>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [message, setMessage] = useState("");
  const toast = useToast();
  const params = useMemo(() => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search), []);
  const classId = params.get("classId");
  const subjectId = params.get("subjectId");

  const load = useCallback(async () => {
    if (!classId || !subjectId) { setMessage("Choose a subject from your dashboard first."); setLoading(false); return; }
    setLoading(true);
    try {
      const response = await fetch(`/api/attendance?classId=${encodeURIComponent(classId)}&subjectId=${encodeURIComponent(subjectId)}&date=${encodeURIComponent(date)}&all=true`, { headers: await authHeaders() });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Unable to load attendance."));
      const nextAttendance = (result.attendance ?? []) as Attendance[];
      setStudents((result.students ?? []) as Student[]);
      setAttendance(nextAttendance);
      setRecords(Object.fromEntries(nextAttendance.filter((item) => item.date === date).map((item) => [item.studentUid, item.present])));
      setSubjectName(String((result.subject as { name?: string } | undefined)?.name ?? "Attendance"));
      setClassData((result.class ?? {}) as ClassData);
      setCanEdit(result.canEdit === true && date === karachiDate());
      setMessage(`${nextAttendance.length} records loaded for ${date}.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to load attendance.";
      setMessage(text); toast(text, "error");
    } finally { setLoading(false); }
  }, [classId, subjectId, date, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredStudents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) => `${student.seatNumber ?? ""} ${student.fullName ?? ""}`.toLowerCase().includes(needle));
  }, [students, search]);

  const dates = useMemo(() => [...new Set(attendance.map((item) => item.date))].sort(), [attendance]);
  const matrix = useMemo(() => students.map((student) => {
    const statuses = dates.map((day) => attendance.find((item) => item.studentUid === student.uid && item.date === day));
    return { student, statuses, present: statuses.filter((item) => item?.present).length, marked: statuses.filter(Boolean).length };
  }), [students, attendance, dates]);

  async function save() {
    if (!classId || !subjectId) return;
    setBusy(true);
    try {
      const response = await fetch("/api/attendance", { method: "POST", headers: await authHeaders(true), body: JSON.stringify({ classId, subjectId, date, records: students.map((student) => ({ studentUid: student.uid, present: records[student.uid] === true })) }) });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Unable to save attendance."));
      setConfirmSave(false); toast("Attendance saved and synchronized to Google Sheets.", "success"); await load();
    } catch (error) { toast(error instanceof Error ? error.message : "Unable to save attendance.", "error"); }
    finally { setBusy(false); }
  }

  const header = `${classData.university ?? ""} · ${classData.department ?? ""} · ${classData.className ?? ""} · Section ${classData.section ?? ""} · ${classData.semester ?? ""}`;
  return <main className="min-h-screen px-4 py-8 sm:px-6"><div className="mx-auto max-w-7xl">
    <p className="text-sm text-emerald-400">Attendance · {subjectName}</p>
    <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-4xl font-semibold text-white">Daily attendance</h1><p className="mt-2 text-sm text-slate-400">{canEdit ? "Today is editable until midnight Asia/Karachi." : "This date is read-only."}</p></div><div className="flex flex-wrap gap-3"><input value={search} onChange={(event) => setSearch(event.target.value)} className="field mt-0 w-64" placeholder="Search name or seat number" /><label className="text-xs text-slate-400">Attendance date<input type="date" value={date} max={karachiDate()} onChange={(event) => setDate(event.target.value)} className="field mt-1" /></label></div></div>
    {message && <p className="mt-5 text-sm text-slate-400">{message}</p>}
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400"><tr><th className="w-24 px-5 py-4">Status</th><th className="px-5 py-4">Seat number</th><th className="px-5 py-4">Student name</th><th className="px-5 py-4">Father name</th></tr></thead><tbody className="divide-y divide-white/[0.06]">{loading ? Array.from({ length: 6 }, (_, index) => <tr key={index}><td colSpan={4} className="px-5 py-4"><div className="skeleton h-5 w-full" /></td></tr>) : filteredStudents.length ? filteredStudents.map((student) => <tr key={student.uid} className="hover:bg-white/[0.03]"><td className="px-5 py-4"><input type="checkbox" aria-label={`Present: ${student.fullName ?? student.uid}`} disabled={!canEdit} checked={records[student.uid] === true} onChange={(event) => setRecords((current) => ({ ...current, [student.uid]: event.target.checked }))} className="h-5 w-5 accent-emerald-400" /></td><td className="px-5 py-4 font-medium text-white">{student.seatNumber ?? "—"}</td><td className="px-5 py-4 text-slate-200">{student.fullName ?? "Unnamed student"}</td><td className="px-5 py-4 text-slate-400">{student.fatherName ?? "—"}</td></tr>) : <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">No students match this search.</td></tr>}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-4"><span className="text-sm text-slate-400">{filteredStudents.length} of {students.length} students</span>{canEdit && <button disabled={busy || loading} onClick={() => setConfirmSave(true)} className="button-primary">{busy ? "Saving..." : "Save attendance"}</button>}</div></section>
    <section className="mt-10"><div><p className="text-sm text-emerald-400">Google Sheets blueprint</p><h2 className="mt-1 text-2xl font-semibold text-white">{subjectName} register</h2></div><div className="mt-4 overflow-x-auto rounded-2xl border border-blue-400/20 bg-[#071827] p-4"><p className="mb-4 text-xs text-blue-200">{header}</p><table className="min-w-full text-left text-xs"><thead><tr className="border-b border-blue-300/20 text-blue-200"><th className="px-3 py-3">Seat number</th><th className="px-3 py-3">Student name</th><th className="px-3 py-3">Father name</th>{dates.map((day) => <th key={day} className="px-3 py-3 whitespace-nowrap">{day}</th>)}<th className="px-3 py-3">Total</th></tr></thead><tbody>{matrix.map(({ student, statuses, present, marked }) => <tr key={student.uid} className="border-b border-blue-300/10 text-slate-300"><td className="px-3 py-3">{student.seatNumber ?? "—"}</td><td className="px-3 py-3">{student.fullName ?? "—"}</td><td className="px-3 py-3">{student.fatherName ?? "—"}</td>{statuses.map((item, index) => <td key={`${student.uid}-${index}`} className="px-3 py-3">{item ? item.present ? "Present" : "Absent" : "—"}</td>)}<td className="px-3 py-3 font-semibold text-blue-200">{present}/{marked}</td></tr>)}</tbody></table></div></section>
    {confirmSave && <ActionModal title="Save attendance?" description="Once saved, today’s attendance can only be edited until midnight in Asia/Karachi. Past dates are permanently locked." confirmLabel="Save permanently" onClose={() => setConfirmSave(false)} onConfirm={() => void save()} />}
  </div></main>;
}
