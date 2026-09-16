"use client";

import { onAuthStateChanged } from "firebase/auth";
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
import { 
  Users, 
  BookOpen, 
  CheckCircle2, 
  KeyRound, 
  Copy, 
  Check, 
  Plus, 
  ExternalLink, 
  FileSpreadsheet, 
  Edit3, 
  Trash2, 
  GraduationCap, 
  ArrowRight, 
  Clock, 
  Sparkles 
} from "lucide-react";

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [classRecord, setClassRecord] = useState<ClassRecord | null>(null);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [message, setMessage] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  const [attendanceSummary, setAttendanceSummary] = useState({ total: 0, present: 0 });
  const [attendanceHistory, setAttendanceHistory] = useState<{ date: string; present: boolean }[]>([]);
  const [editingSubject, setEditingSubject] = useState<SubjectRecord | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editTeacherUid, setEditTeacherUid] = useState("");
  const [members, setMembers] = useState<{ uid: string; fullName?: string; role: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<SubjectRecord | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSecondaryCr, setIsSecondaryCr] = useState(false);
  const [isCrEnrolledAsStudent, setIsCrEnrolledAsStudent] = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ seatNumber: "", fatherName: "" });
  const [enrolling, setEnrolling] = useState(false);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        const response = await fetch("/api/dashboard", { headers: await authHeaders() });
        const result = await readApiResponse(response);
        if (response.status === 404) {
          router.push("/complete-profile");
          return;
        }
        if (!response.ok) throw new Error(String(result.error ?? "Unable to load your workspace."));
        const nextProfile = result.profile as UserProfile;
        setProfile(nextProfile);
        setClassRecord(result.class as ClassRecord | null);
        setSubjects((result.subjects ?? []) as SubjectRecord[]);
        setMembers((result.members ?? []) as { uid: string; fullName?: string; role: string }[]);
        setMemberCount(Number(result.memberCount ?? 0));
        setIsSecondaryCr(Boolean(result.isSecondaryCr));
        setIsCrEnrolledAsStudent(result.isCrEnrolledAsStudent !== false);
        const records = (result.attendance ?? []) as { date: string; present: boolean }[];
        setAttendanceSummary({
          total: records.length,
          present: records.filter((item) => item.present).length,
        });
        setAttendanceHistory(records.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unable to load your workspace.";
        setMessage(errorMessage);
        toast(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    });
  }, [router, toast]);



  async function connectSheets() {
    if (!classRecord) return;
    setConnecting(true);
    setMessage("");
    const response = await fetch("/api/google/authorize", {
      method: "POST",
      headers: await authHeaders(true),
      body: JSON.stringify({ classId: classRecord.id }),
    });
    const result = await readApiResponse(response);
    if (!response.ok) {
      setMessage(String(result.error ?? "Unable to start Google authorization."));
      setConnecting(false);
      return;
    }
    if (typeof result.url !== "string") {
      setMessage("Google authorization did not return a redirect URL.");
      setConnecting(false);
      return;
    }
    window.location.assign(result.url);
  }

  async function updateSubject(subjectId: string) {
    const response = await fetch("/api/subjects", {
      method: "PATCH",
      headers: await authHeaders(true),
      body: JSON.stringify({
        subjectId,
        name: editSubjectName,
        teacherUid: editTeacherUid || null,
      }),
    });
    const result = await readApiResponse(response);
    if (!response.ok) {
      const error = String(result.error ?? "Unable to update subject.");
      setMessage(error);
      toast(error, "error");
      return;
    }
    setSubjects((current) =>
      current.map((subject) =>
        subject.id === subjectId
          ? { ...subject, name: editSubjectName.trim(), teacherUid: editTeacherUid || undefined }
          : subject
      )
    );
    setEditingSubject(null);
    toast("Subject updated and sheet tab renamed.", "success");
  }

  async function deleteSubject(subjectId: string) {
    const response = await fetch(`/api/subjects?subjectId=${encodeURIComponent(subjectId)}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    const result = await readApiResponse(response);
    if (!response.ok) {
      const error = String(result.error ?? "Unable to delete subject.");
      setMessage(error);
      toast(error, "error");
      return;
    }
    setSubjects((current) => current.filter((subject) => subject.id !== subjectId));
    toast("Subject deleted.", "success");
  }

  const copyClassCode = () => {
    if (!classRecord?.classCode) return;
    navigator.clipboard.writeText(classRecord.classCode);
    setCopiedCode(true);
    toast("Class code copied to clipboard!", "success");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  async function handleEnrollCrAsStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!classRecord) return;
    setEnrolling(true);
    try {
      const response = await fetch("/api/students", {
        method: "PATCH",
        headers: await authHeaders(true),
        body: JSON.stringify({
          classId: classRecord.id,
          action: "enroll_cr",
          seatNumber: enrollForm.seatNumber,
          fatherName: enrollForm.fatherName,
        }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Failed to enroll as student."));
      toast("You are now enrolled in the class student roster!", "success");
      setShowEnrollModal(false);
      setIsCrEnrolledAsStudent(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Enrollment failed.", "error");
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="skeleton h-3.5 w-3.5 rounded-full" />
              <div className="skeleton h-3.5 w-36 rounded-md" />
            </div>
            <div className="mt-1 skeleton h-8 sm:h-9 w-64 sm:w-72 rounded-xl" />
            <div className="mt-1 skeleton h-4 w-72 sm:w-80 rounded-md" />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <div className="skeleton h-[38px] w-32 rounded-xl" />
            <div className="skeleton h-[38px] w-24 rounded-xl" />
          </div>
        </div>

        {/* 3 KPI Stat Cards Skeleton (Identical to StatCard component) */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="card p-5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <div className="skeleton h-3.5 w-28 rounded" />
                  <div className="skeleton mt-2 h-9 w-20 rounded-lg" />
                </div>
                <div className="skeleton h-10 w-10 rounded-xl flex-none" />
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <div className="skeleton h-3.5 w-36 rounded" />
                {item === 3 && <div className="skeleton h-6 w-14 rounded-lg" />}
              </div>
            </div>
          ))}
        </div>

        {/* Subjects Section Skeleton */}
        <section className="mt-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="skeleton h-6 w-44 rounded-lg" />
              <div className="mt-1 skeleton h-4 w-72 rounded-md" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="skeleton h-8 w-28 rounded-xl" />
              <div className="skeleton h-8 w-28 rounded-xl" />
              <div className="skeleton h-8 w-36 rounded-xl" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="card p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="skeleton h-10 w-10 rounded-xl" />
                    {item === 1 && <div className="skeleton h-5 w-20 rounded-full" />}
                  </div>
                  <div className="mt-4 block">
                    <div className="skeleton h-5 w-40 rounded" />
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="skeleton h-3.5 w-3.5 rounded-full" />
                      <div className="skeleton h-3.5 w-36 rounded" />
                    </div>
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                  <div className="skeleton h-4 w-28 rounded-md" />
                  <div className="flex items-center gap-1.5">
                    <div className="skeleton h-7 w-7 rounded-lg" />
                    <div className="skeleton h-7 w-7 rounded-lg" />
                    <div className="skeleton h-7 w-7 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              Welcome back, {profile?.name?.split(" ")[0] ?? "there"}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {classRecord ? `${classRecord.className} Workspace` : "Your Workspace"}
          </h1>
          {classRecord && (
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
              {classRecord.university} · {classRecord.department} · Sec {classRecord.section} · {classRecord.semester}
            </p>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap gap-2.5">
          {profile?.role === "cr" && classRecord && (
            <>
              <Link href="/cr/requests" className="button-secondary text-xs sm:text-sm">
                Manage requests
              </Link>
              <Link href={`/cr/setup?edit=${classRecord.id}`} className="button-secondary text-xs sm:text-sm">
                Edit class
              </Link>
            </>
          )}
          {!classRecord && (
            profile?.role === "cr" ? (
              <Link href="/cr/setup" className="button-primary text-xs sm:text-sm">
                <span>Create your class</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link href="/join" className="button-primary text-xs sm:text-sm">
                <span>Join your class</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )
          )}
        </div>
      </div>

      {!classRecord ? (
        /* Empty Workspace Prompt */
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center sm:p-14">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <BookOpen className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-white sm:text-xl">
            {profile?.role === "cr" ? "Create your class to get started" : "Join your class to get started"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-[var(--text-secondary)]">
            {profile?.role === "cr"
              ? "Set up your department, semester, and subjects. Google Sheets will synchronize automatically."
              : "Ask your Class Representative for your 8-digit class code to access daily subjects and attendance."}
          </p>
          {profile?.role === "cr" && (
            <div className="mt-6">
              <Link
                href="/cr/setup"
                className="button-primary"
              >
                <span>Set up class</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* CR Self-Enrollment Notice Card */}
          {profile?.role === "cr" && classRecord && !isCrEnrolledAsStudent && (
            <div className="mt-6 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)]/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[var(--primary)] text-[#07110D] font-black text-sm">
                  CR
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    You haven&apos;t added yourself to your class student roster yet
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    As the Class Representative, you are also an enrolled student. Add yourself so teachers and attendance registers include you!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrollModal(true)}
                className="button-primary text-xs py-2 px-4 whitespace-nowrap self-start sm:self-auto"
              >
                Add Myself as Student
              </button>
            </div>
          )}

          {/* Summary / Stat Cards */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={Users}
              label="Approved Students"
              value={String(memberCount)}
              subtext="Enrolled in class roster"
            />
            <StatCard
              icon={BookOpen}
              label="Active Subjects"
              value={String(subjects.length)}
              subtext="Managed this semester"
            />
            {profile?.role === "student" ? (
              <StatCard
                icon={CheckCircle2}
                label="My Attendance"
                value={`${attendanceSummary.present}/${attendanceSummary.total}`}
                subtext={`${attendanceSummary.total ? Math.round((attendanceSummary.present / attendanceSummary.total) * 100) : 0}% attendance rate`}
                accent
              />
            ) : (
              <div className="card p-5 relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)]">Class Access Code</p>
                    <p className="mt-2 text-2xl font-extrabold tracking-wider text-[var(--accent)] font-mono">
                      {classRecord.classCode}
                    </p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-hover)]">
                    <KeyRound className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-muted)]">Share with your students</span>
                  <button
                    type="button"
                    onClick={copyClassCode}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
                        <span className="text-[var(--accent)]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Student Attendance History Overview */}
          {profile?.role === "student" && (
            <section className="mt-10 card p-6">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-[var(--accent)]" />
                  <h2 className="text-sm font-bold text-white">Recent Attendance Record</h2>
                </div>
                <Link href="/history" className="text-xs font-medium text-[var(--accent)] hover:underline">
                  View full history →
                </Link>
              </div>
              <div className="mt-4 divide-y divide-[var(--border)]">
                {attendanceHistory.length ? (
                  attendanceHistory.map((item) => (
                    <div key={item.date} className="flex items-center justify-between py-3">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{item.date}</span>
                      <span className={item.present ? "badge-present" : "badge-absent"}>
                        {item.present ? "Present" : "Absent"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                    No attendance recorded for your profile yet.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Subjects Section */}
          <section className="mt-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Subjects & Registers</h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Select a subject to take attendance or view the Google Sheet register.
                </p>
              </div>

              {profile?.role === "cr" && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={connectSheets}
                    disabled={connecting}
                    className="button-secondary text-xs"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>{connecting ? "Connecting..." : classRecord.spreadsheetId ? "Sheets Synced" : "Connect Sheets"}</span>
                  </button>
                  {classRecord.spreadsheetId && (
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={`https://docs.google.com/spreadsheets/d/${classRecord.spreadsheetId}`}
                      className="button-secondary text-xs"
                      title="Open Google Spreadsheet in new tab"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Spreadsheet</span>
                    </a>
                  )}
                  <Link
                    href="/subjects"
                    className="button-primary text-xs py-2 px-3 inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Manage Subjects</span>
                  </Link>
                </div>
              )}
            </div>

            {message && <p className="mt-3 text-xs text-[var(--accent)]">{message}</p>}

            {/* Subjects Grid */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.length ? (
                subjects.map((subject) => {
                  const isAssignedToCurrentTeacher = subject.teacherUid === firebaseAuth.currentUser?.uid;
                  const isStudentUser = profile?.role === "student";
                  const isSecondaryCrUser = isStudentUser && isSecondaryCr;
                  const canAccessAttendance =
                    profile?.role === "cr" || isStudentUser || isAssignedToCurrentTeacher;
                  const attendanceHref = isStudentUser && !isSecondaryCrUser
                    ? `/history?subjectId=${subject.id}`
                    : `/attendance?classId=${classRecord.id}&subjectId=${subject.id}`;
                  const assignedTeacherName = subject.teacherName ?? members.find((m) => m.uid === subject.teacherUid)?.fullName;

                  return (
                    <div
                      key={subject.id}
                      className="card card-hover p-5 flex flex-col justify-between group transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--accent)] group-hover:border-[var(--border-hover)]">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          {isAssignedToCurrentTeacher && (
                            <span className="badge-present text-[10px]">Your Subject</span>
                          )}
                          {isSecondaryCrUser && (
                            <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold">
                              2nd CR Access
                            </span>
                          )}
                        </div>

                        <Link
                          href={canAccessAttendance ? attendanceHref : "#"}
                          className={`mt-4 block ${!canAccessAttendance ? "cursor-default" : ""}`}
                        >
                          <h3 className="text-base font-bold text-white group-hover:text-[var(--accent)] transition-colors">
                            {subject.name}
                          </h3>
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                            <GraduationCap className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            <span>
                              {assignedTeacherName ? `Prof. ${assignedTeacherName}` : "Awaiting teacher assignment"}
                            </span>
                          </div>
                        </Link>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                        {canAccessAttendance ? (
                          <Link
                            href={attendanceHref}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:text-[var(--primary-hover)]"
                          >
                            <span>{isStudentUser && !isSecondaryCrUser ? "View My Attendance" : "Take Attendance"}</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-[11px] text-[var(--text-muted)]">Read-only view</span>
                        )}

                        {(profile?.role === "cr" || isAssignedToCurrentTeacher) && (
                          <div className="flex items-center gap-1.5">
                            {classRecord?.spreadsheetId && (
                              <a
                                target="_blank"
                                rel="noreferrer"
                                href={`https://docs.google.com/spreadsheets/d/${classRecord.spreadsheetId}/edit#gid=${subject.googleSheetTabId ?? 0}`}
                                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--accent)] transition-colors"
                                title="Open subject Google Sheet tab"
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSubject(subject);
                                setEditSubjectName(subject.name);
                                setEditTeacherUid(subject.teacherUid ?? "");
                              }}
                              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-white transition-colors"
                              title="Edit subject"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(subject)}
                              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              title="Delete subject"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center sm:p-12">
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-muted)]">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-white">No subjects added yet</h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {profile?.role === "cr"
                      ? "Create your first subject above to generate an attendance ledger in Google Sheets."
                      : "Your Class Representative has not created any subjects for this semester yet."}
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Edit Subject Modal */}
      {editingSubject && (
        <ActionModal
          title="Edit Subject"
          description="Update the course title and assign or reassign its teacher."
          confirmLabel="Save Changes"
          onClose={() => setEditingSubject(null)}
          onConfirm={() => void updateSubject(editingSubject.id)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Subject Name
              </label>
              <input
                value={editSubjectName}
                onChange={(event) => setEditSubjectName(event.target.value)}
                className="field mt-1.5"
                placeholder="e.g. Software Quality Assurance"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Assigned Teacher
              </label>
              <CustomSelect
                value={editTeacherUid}
                placeholder="Select a teacher"
                options={[
                  { value: "", label: "No Teacher Assigned" },
                  ...members
                    .filter((member) => member.role === "teacher")
                    .map((member) => ({
                      value: member.uid,
                      label: member.fullName ? `Prof. ${member.fullName}` : `Teacher (${member.uid.substring(0, 6)}...)`,
                    })),
                  ...(editingSubject.teacherUid && !members.some((m) => m.uid === editingSubject.teacherUid)
                    ? [{
                        value: editingSubject.teacherUid,
                        label: editingSubject.teacherName ? `Prof. ${editingSubject.teacherName}` : "Assigned Teacher",
                      }]
                    : []),
                ]}
                onChange={setEditTeacherUid}
              />
            </div>
          </div>
        </ActionModal>
      )}

      {/* Delete Subject Modal */}
      {confirmDelete && (
        <ActionModal
          title="Delete Subject?"
          description={`Permanently remove "${confirmDelete.name}" and its Google Sheet tab. Historical records for this subject will be purged.`}
          confirmLabel="Delete Subject"
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            const subject = confirmDelete;
            setConfirmDelete(null);
            void deleteSubject(subject.id);
          }}
        />
      )}

      {/* CR Self-Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-hover)] bg-[var(--surface)] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowEnrollModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-white"
            >
              <Check className="sr-only" />
              <span className="text-sm font-bold">✕</span>
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border)]">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Enroll as Student</h3>
                <p className="text-xs text-[var(--text-secondary)]">Add your account to this class student roster</p>
              </div>
            </div>

            <form onSubmit={handleEnrollCrAsStudent} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  My Seat Number <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  value={enrollForm.seatNumber}
                  onChange={(e) => setEnrollForm((c) => ({ ...c, seatNumber: e.target.value }))}
                  className="field mt-1.5 font-mono"
                  placeholder="e.g. BSCS-2024-001"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Father Name
                </label>
                <input
                  value={enrollForm.fatherName}
                  onChange={(e) => setEnrollForm((c) => ({ ...c, fatherName: e.target.value }))}
                  className="field mt-1.5"
                  placeholder="e.g. Muhammad ..."
                />
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrolling}
                  className="button-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                >
                  {enrolling ? (
                    <span>Enrolling...</span>
                  ) : (
                    <span>Add to Student Roster</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  accent = false,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  subtext?: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-5 relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p>
          <p className={`mt-2 text-3xl font-extrabold tracking-tight ${accent ? "text-[var(--accent)]" : "text-white"}`}>
            {value}
          </p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-elevated)] text-[var(--accent)] border border-[var(--border)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {subtext && (
        <p className="mt-4 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
          {subtext}
        </p>
      )}
    </div>
  );
}

