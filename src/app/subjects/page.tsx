"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import type { ClassRecord, SubjectRecord } from "@/lib/domain";
import { ArrowLeft, BookOpen, GraduationCap, ArrowRight, Sparkles } from "lucide-react";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [classRecord, setClassRecord] = useState<ClassRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/dashboard", { headers: await authHeaders() });
          const result = await readApiResponse(response);
          if (response.ok) {
            setSubjects((result.subjects ?? []) as SubjectRecord[]);
            setClassRecord(result.class as ClassRecord | null);
          }
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Dashboard</span>
      </Link>

      {/* Page Header */}
      <div className="mt-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Curriculum & Roll-Call</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Class Subjects
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
          {classRecord ? `${classRecord.className} · ` : ""}Open any course subject to view attendance records, history, and its master Google Sheet register.
        </p>
      </div>

      {/* Subjects Grid */}
      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="skeleton h-36" />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.length ? (
            subjects.map((subject) => {
              const classId = classRecord?.id ?? subject.classId;
              const href = `/attendance?classId=${classId}&subjectId=${subject.id}`;
              const teacherDisplay = subject.teacherName ?? (subject.teacherUid ? "Teacher assigned" : "Awaiting teacher");

              return (
                <Link
                  key={subject.id}
                  href={href}
                  className="card card-hover p-6 flex flex-col justify-between group transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--accent)] group-hover:border-[var(--border-hover)]">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                        Active
                      </span>
                    </div>

                    <h2 className="mt-5 text-base font-bold text-white group-hover:text-[var(--accent)] transition-colors">
                      {subject.name}
                    </h2>

                    <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <GraduationCap className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      <span>{teacherDisplay}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-3.5 border-t border-[var(--border)] flex items-center justify-between text-xs font-semibold text-[var(--accent)]">
                    <span>View Attendance Register</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="sm:col-span-2 lg:col-span-3 card p-10 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
              <p className="mt-4 text-sm font-semibold text-white">No active subjects registered</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Return to the dashboard to create course subjects for your class workspace.
              </p>
              <Link href="/dashboard" className="button-primary mt-6 text-xs inline-flex">
                <span>Go to Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

