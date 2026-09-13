"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import type { ClassRecord, SubjectRecord } from "@/lib/domain";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [classRecord, setClassRecord] = useState<ClassRecord | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => void (async () => {
    const response = await fetch("/api/dashboard", { headers: await authHeaders() });
    const result = await readApiResponse(response);
    if (response.ok) { setSubjects((result.subjects ?? []) as SubjectRecord[]); setClassRecord(result.class as ClassRecord | null); }
    setLoading(false);
  })(), 0); return () => window.clearTimeout(timer); }, []);
  return <main className="app-page"><div className="app-page-header"><div><Link href="/dashboard" className="back-link">← Dashboard</Link><p className="eyebrow">Your class</p><h1>Subjects</h1><p>Open a subject to view attendance, history, and its register.</p></div></div>{loading ? <div className="page-skeleton-grid">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-32" />)}</div> : <div className="subject-grid">{subjects.length ? subjects.map((subject) => <Link key={subject.id} href={`/attendance?classId=${classRecord?.id ?? subject.classId}&subjectId=${subject.id}`} className="subject-tile"><span className="subject-tile-icon">▦</span><span><strong>{subject.name}</strong><small>{subject.teacherName ?? (subject.teacherUid ? "Teacher assigned" : "Awaiting teacher")}</small></span><span className="subject-arrow">→</span></Link>) : <p className="empty-card">No active subjects yet.</p>}</div>}</main>;
}
