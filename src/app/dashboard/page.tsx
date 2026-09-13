"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { firebaseAuth, firestore } from "@/lib/firebase";
import { authHeaders } from "@/lib/client-auth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClassRecord, SubjectRecord, UserProfile } from "@/lib/domain";

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [classRecord, setClassRecord] = useState<ClassRecord | null>(null);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [message, setMessage] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => onAuthStateChanged(firebaseAuth, async (user) => {
    if (!user) { router.push("/login"); return; }
    const snapshot = await getDoc(doc(firestore, "users", user.uid));
    if (!snapshot.exists()) { router.push("/complete-profile"); return; }
    const nextProfile = snapshot.data() as UserProfile;
    setProfile(nextProfile);
    const classes = nextProfile.role === "cr" ? await getDocs(query(collection(firestore, "classes"), where("crUid", "==", user.uid))) : null;
    let own = classes?.docs[0];
    if (!own && nextProfile.role !== "cr") {
      const memberships = await getDocs(query(collection(firestore, "memberships"), where("uid", "==", user.uid), where("status", "==", "approved")));
      const membership = memberships.docs[0];
      if (membership) {
        const classSnapshot = await getDoc(doc(firestore, "classes", membership.data().classId));
        if (classSnapshot.exists()) own = classSnapshot;
      }
    }
    if (own) {
      const record = { id: own.id, ...own.data() } as ClassRecord;
      setClassRecord(record);
      const subjectDocs = await getDocs(query(collection(firestore, "subjects"), where("classId", "==", own.id), where("active", "==", true)));
      setSubjects(subjectDocs.docs.map((item) => ({ id: item.id, ...item.data() }) as SubjectRecord));
    }
    setLoading(false);
  }), [router]);

  async function createSubject() {
    if (!classRecord || !subjectName.trim()) return;
    setMessage("");
    const response = await fetch("/api/subjects", { method: "POST", headers: await authHeaders(true), body: JSON.stringify({ classId: classRecord.id, name: subjectName.trim() }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "Unable to create subject."); return; }
    setSubjects((current) => [...current, { id: result.id, classId: classRecord.id, name: subjectName.trim(), active: true, createdAt: "", updatedAt: "" }]);
    setSubjectName("");
    setMessage("Subject created.");
  }

  async function connectSheets() {
    if (!classRecord) return;
    setConnecting(true);
    setMessage("");
    const response = await fetch("/api/google/authorize", { method: "POST", headers: await authHeaders(true), body: JSON.stringify({ classId: classRecord.id }) });
    const result = await response.json().catch(() => ({ error: "The server returned an invalid response." }));
    if (!response.ok) { setMessage(result.error ?? "Unable to start Google authorization."); setConnecting(false); return; }
    window.location.assign(result.url);
  }

  if (loading) return <main className="grid min-h-screen place-items-center text-slate-400">Loading your workspace...</main>;
  return <main className="min-h-screen"><header className="border-b border-white/10"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><Link href="/" className="font-semibold text-white">attensheet<span className="text-emerald-400">.</span></Link><div className="flex items-center gap-4"><span className="text-sm text-slate-400">{profile?.name}</span><button onClick={() => signOut(firebaseAuth)} className="text-sm text-slate-400 hover:text-white">Sign out</button></div></div></header>
    <div className="mx-auto max-w-7xl px-6 py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-emerald-400">Good morning, {profile?.name?.split(" ")[0]}</p><h1 className="mt-2 text-4xl font-semibold text-white">Your workspace</h1></div>{profile?.role === "cr" ? <div className="flex gap-3"><Link href="/cr/requests" className="button-secondary">Requests</Link><Link href="/cr/setup" className="button-primary">Set up a class <span>→</span></Link></div> : <Link href="/join" className="button-primary">Join a class <span>→</span></Link>}</div>
      {!classRecord ? <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center"><p className="text-lg font-medium text-white">{profile?.role === "cr" ? "Create your class to get started" : "Join your class to get started"}</p><p className="mx-auto mt-2 max-w-md text-sm text-slate-400">Your approved subjects, requests, and attendance will appear here once your class workspace is ready.</p></div> : <><div className="mt-10 grid gap-4 sm:grid-cols-3"><Stat label="Students" value="—" /><Stat label="Subjects" value={String(subjects.length)} /><Stat label="Class code" value={classRecord.classCode} /></div><section className="mt-10"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-white">Subjects</h2>{profile?.role === "cr" && <div className="flex flex-wrap gap-2"><button onClick={connectSheets} disabled={connecting} className="button-secondary">{connecting ? "Connecting..." : classRecord.spreadsheetId ? "Reconnect Google Sheets" : "Connect Google Sheets"}</button><input value={subjectName} onChange={(event) => setSubjectName(event.target.value)} className="field mt-0 w-56" placeholder="Subject name" /><button onClick={createSubject} className="button-primary">Add subject</button></div>}</div>{message && <p className="mt-3 text-sm text-slate-400">{message}</p>}<div className="mt-4 grid gap-4 md:grid-cols-3">{subjects.length ? subjects.map((subject) => <Link href={profile?.role === "teacher" ? `/attendance?classId=${classRecord.id}&subjectId=${subject.id}` : "#"} key={subject.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-5"><p className="font-medium text-white">{subject.name}</p><p className="mt-2 text-sm text-slate-400">{subject.teacherUid ? "Teacher assigned" : "Awaiting teacher"}</p></Link>) : <p className="text-sm text-slate-500">No subjects yet.</p>}</div></section></>}
    </div></main>;
}
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>; }
