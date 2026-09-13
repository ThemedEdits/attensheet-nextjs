"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClassRecord, SubjectRecord, UserProfile } from "@/lib/domain";
import { useToast } from "@/components/ToastProvider";
import { CustomSelect } from "@/components/CustomSelect";
import { ActionModal } from "@/components/ActionModal";

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [classRecord, setClassRecord] = useState<ClassRecord | null>(null);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [message, setMessage] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  const [attendanceSummary, setAttendanceSummary] = useState({ total: 0, present: 0 });
  const [attendanceHistory, setAttendanceHistory] = useState<{date:string; present:boolean}[]>([]);
  const [editingSubject, setEditingSubject] = useState<SubjectRecord | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editTeacherUid, setEditTeacherUid] = useState("");
  const [members, setMembers] = useState<{ uid: string; fullName?: string; role: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<SubjectRecord | null>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => onAuthStateChanged(firebaseAuth, async (user) => {
    if (!user) { router.push("/login"); return; }
    try {
      const response = await fetch("/api/dashboard", { headers: await authHeaders() });
      const result = await readApiResponse(response);
      if (response.status === 404) { router.push("/complete-profile"); return; }
      if (!response.ok) throw new Error(String(result.error ?? "Unable to load your workspace."));
      const nextProfile = result.profile as UserProfile;
      setProfile(nextProfile);
      setClassRecord(result.class as ClassRecord | null);
      setSubjects((result.subjects ?? []) as SubjectRecord[]);
      setMembers((result.members ?? []) as { uid: string; fullName?: string; role: string }[]);
      setMemberCount(Number(result.memberCount ?? 0));
      const records = (result.attendance ?? []) as { date: string; present: boolean }[];
      setAttendanceSummary({ total: records.length, present: records.filter((item) => item.present).length });
      setAttendanceHistory(records.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to load your workspace.";
      setMessage(errorMessage); toast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }), [router, toast]);

  async function createSubject() {
    if (!classRecord || !subjectName.trim()) return;
    setMessage("");
    const response = await fetch("/api/subjects", { method: "POST", headers: await authHeaders(true), body: JSON.stringify({ classId: classRecord.id, name: subjectName.trim() }) });
    const result = await readApiResponse(response);
    if (!response.ok) { const error = String(result.error ?? "Unable to create subject."); setMessage(error); toast(error, "error"); return; }
    setSubjects((current) => [...current, { id: String(result.id), classId: classRecord.id, name: subjectName.trim(), active: true, createdAt: "", updatedAt: "" }]);
    setSubjectName("");
    setMessage("Subject created."); toast("Subject added and sheet roster updated.", "success");
  }

  async function connectSheets() {
    if (!classRecord) return;
    setConnecting(true);
    setMessage("");
    const response = await fetch("/api/google/authorize", { method: "POST", headers: await authHeaders(true), body: JSON.stringify({ classId: classRecord.id }) });
    const result = await readApiResponse(response);
    if (!response.ok) { setMessage(String(result.error ?? "Unable to start Google authorization.")); setConnecting(false); return; }
    if (typeof result.url !== "string") { setMessage("Google authorization did not return a redirect URL."); setConnecting(false); return; }
    window.location.assign(result.url);
  }
  async function updateSubject(subjectId: string) {
    const response = await fetch("/api/subjects", { method: "PATCH", headers: await authHeaders(true), body: JSON.stringify({ subjectId, name: editSubjectName, teacherUid: editTeacherUid || null }) });
    const result = await readApiResponse(response);
    if (!response.ok) { const error = String(result.error ?? "Unable to update subject."); setMessage(error); toast(error, "error"); return; }
    setSubjects((current) => current.map((subject) => subject.id === subjectId ? { ...subject, name: editSubjectName.trim(), teacherUid: editTeacherUid || undefined } : subject));
    setEditingSubject(null); toast("Subject updated and sheet tab renamed.", "success");
  }
  async function deleteSubject(subjectId: string) {
    const response = await fetch(`/api/subjects?subjectId=${encodeURIComponent(subjectId)}`, { method: "DELETE", headers: await authHeaders() });
    const result = await readApiResponse(response);
    if (!response.ok) { const error = String(result.error ?? "Unable to delete subject."); setMessage(error); toast(error, "error"); return; }
    setSubjects((current) => current.filter((subject) => subject.id !== subjectId)); toast("Subject deleted.", "success");
  }

  if (loading) return <main className="grid min-h-screen place-items-center text-slate-400">Loading your workspace...</main>;
  return <main className="min-h-screen"><header className="border-b border-white/10"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><Link href="/" className="font-semibold text-white">attensheet<span className="text-emerald-400">.</span></Link><div className="flex items-center gap-4"><span className="text-sm text-slate-400">{profile?.name}</span><button onClick={() => signOut(firebaseAuth)} className="text-sm text-slate-400 hover:text-white">Sign out</button></div></div></header>
    <div className="mx-auto max-w-7xl px-6 py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-emerald-400">Good morning, {profile?.name?.split(" ")[0]}</p><h1 className="mt-2 text-4xl font-semibold text-white">Your workspace</h1></div>{profile?.role === "cr" ? <div className="flex gap-3"><Link href="/cr/requests" className="button-secondary">Manage requests</Link>{classRecord && <Link href={`/cr/setup?edit=${classRecord.id}`} className="button-secondary">Edit class</Link>}</div> : !classRecord ? <Link href="/join" className="button-primary">Join a class <span>→</span></Link> : null}</div>
      {!classRecord ? <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center"><p className="text-lg font-medium text-white">{profile?.role === "cr" ? "Create your class to get started" : "Join your class to get started"}</p><p className="mx-auto mt-2 max-w-md text-sm text-slate-400">Your approved subjects, requests, and attendance will appear here once your class workspace is ready.</p></div> : <>            <div className="mt-10 grid gap-4 sm:grid-cols-3"><Stat label="Students" value={String(memberCount)} /><Stat label="Subjects" value={String(subjects.length)} /><Stat label={profile?.role === "student" ? "My attendance" : "Class code"} value={profile?.role === "student" ? `${attendanceSummary.present}/${attendanceSummary.total} (${attendanceSummary.total ? Math.round(attendanceSummary.present / attendanceSummary.total * 100) : 0}%)` : classRecord.classCode} /></div>{profile?.role === "student" && <section className="mt-10 rounded-xl border border-white/10 bg-white/[0.04] p-5"><h2 className="font-semibold text-white">My attendance history</h2><div className="mt-3 space-y-2 text-sm text-slate-300">{attendanceHistory.length ? attendanceHistory.map((item) => <p key={item.date} className="flex justify-between"><span>{item.date}</span><span className={item.present ? "text-emerald-300" : "text-rose-300"}>{item.present ? "Present" : "Absent"}</span></p>) : <p className="text-slate-500">No attendance recorded yet.</p>}</div></section>}<section className="mt-10"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-white">Subjects</h2>{profile?.role === "cr" && <div className="flex flex-wrap gap-2"><button onClick={connectSheets} disabled={connecting} className="button-secondary">{connecting ? "Connecting..." : classRecord.spreadsheetId ? "Reconnect Google Sheets" : "Connect Google Sheets"}</button>{classRecord.spreadsheetId && <a target="_blank" rel="noreferrer" href={`https://docs.google.com/spreadsheets/d/${classRecord.spreadsheetId}`} className="button-secondary">Open spreadsheet ↗</a>}<input value={subjectName} onChange={(event) => setSubjectName(event.target.value)} className="field mt-0 w-56" placeholder="Subject name" /><button onClick={createSubject} className="button-primary">Add subject</button></div>}</div>{message && <p className="mt-3 text-sm text-slate-400">{message}</p>}                  <div className="mt-4 grid gap-4 md:grid-cols-3">{subjects.length ? subjects.map((subject) => <div key={subject.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-emerald-400/40"><Link href={profile?.role === "cr" || profile?.role === "student" || subject.teacherUid === firebaseAuth.currentUser?.uid ? `/attendance?classId=${classRecord.id}&subjectId=${subject.id}` : "/dashboard"}><p className="font-medium text-white">{subject.name}</p><p className="mt-2 text-sm text-slate-400">{subject.teacherUid ? `Teacher: ${members.find((member) => member.uid === subject.teacherUid)?.fullName ?? "Assigned"}` : "Awaiting teacher"}{profile?.role === "student" && " · Read only"}{profile?.role === "cr" && " · Manage attendance"}</p></Link>{(profile?.role === "cr" || subject.teacherUid === firebaseAuth.currentUser?.uid) && <div className="mt-4 flex gap-2"><button onClick={() => { setEditingSubject(subject); setEditSubjectName(subject.name); setEditTeacherUid(subject.teacherUid ?? ""); }} className="button-secondary px-3 py-2 text-xs">Edit</button><button onClick={() => setConfirmDelete(subject)} className="rounded-lg border border-rose-400/20 px-3 py-2 text-xs text-rose-200 hover:bg-rose-400/10">Delete</button></div>}</div>) : <p className="text-sm text-slate-500">No subjects yet.</p>}</div></section></>}
      {editingSubject && <ActionModal title="Edit subject" description="Update the subject name and assign or change its teacher." confirmLabel="Save changes" onClose={() => setEditingSubject(null)} onConfirm={() => void updateSubject(editingSubject.id)}><input value={editSubjectName} onChange={(event) => setEditSubjectName(event.target.value)} className="field mt-0" placeholder="Subject name" /><div className="mt-3"><CustomSelect value={editTeacherUid} placeholder="Assign a teacher" options={members.filter((member) => member.role === "teacher").map((member) => ({ value: member.uid, label: member.fullName ?? member.uid }))} onChange={setEditTeacherUid} /></div></ActionModal>}
      {confirmDelete && <ActionModal title="Delete subject?" description={`This removes ${confirmDelete.name} and its Google Sheet tab. This cannot be undone.`} confirmLabel="Delete subject" onClose={() => setConfirmDelete(null)} onConfirm={() => { const subject = confirmDelete; setConfirmDelete(null); void deleteSubject(subject.id); }} />}
    </div></main>;
}
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>; }
