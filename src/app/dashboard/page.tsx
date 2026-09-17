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
import { PendingRequestCard, type PendingClassRequest } from "@/components/PendingRequestCard";
import { getCachedSession } from "@/lib/session-cache";
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
  Sparkles,
  Award,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  Share2
} from "lucide-react";

type StudentAttendanceRecord = {
  date: string;
  subjectId: string;
  subjectName: string;
  present: boolean;
};

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
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [isSecondaryCr, setIsSecondaryCr] = useState(false);
  const [isCrEnrolledAsStudent, setIsCrEnrolledAsStudent] = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ seatNumber: "", fatherName: "" });
  const [enrolling, setEnrolling] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<PendingClassRequest | null>(null);
  const [allAttendance, setAllAttendance] = useState<StudentAttendanceRecord[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<"all" | "eligible" | "short">("all");
  const [subjectSearch, setSubjectSearch] = useState("");
  const router = useRouter();
  const toast = useToast();

  const loadWorkspace = async () => {
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
      if (result.pendingRequest) {
        setPendingRequest(result.pendingRequest as PendingClassRequest);
      } else {
        setPendingRequest(null);
      }
      const records = (result.attendance ?? []) as StudentAttendanceRecord[];
      setAllAttendance(records);
      setAttendanceSummary({
        total: records.length,
        present: records.filter((item) => item.present).length,
      });
      setAttendanceHistory(records.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to load your workspace.";
      setMessage(errorMessage);
      toast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      await loadWorkspace();
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

  const shareClassInvite = async () => {
    if (!classRecord?.classCode) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const joinLink = `${origin}/signup?code=${encodeURIComponent(classRecord.classCode)}`;

    const details = [
      classRecord.university ? `🏛️ *University:* ${classRecord.university}` : "",
      classRecord.department ? `📂 *Department:* ${classRecord.department}` : "",
      classRecord.className ? `📚 *Class:* ${classRecord.className} (Sec ${classRecord.section || "A"}, ${classRecord.semester || ""})` : "",
    ].filter(Boolean).join("\n");

    const message = [
      `🎓 *Join our Class on AttenSheet*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      details,
      ``,
      `🔑 *CLASS ACCESS CODE:*`,
      `👉 *${classRecord.classCode}* 👈`,
      ``,
      `📝 *How to Join (Takes 30 seconds):*`,
      `1️⃣ Click to sign up or sign in:`,
      `🔗 ${joinLink}`,
      `2️⃣ Complete your profile (Choose Student or Teacher).`,
      `3️⃣ Enter the Class Code: *${classRecord.classCode}*`,
      `4️⃣ Once approved, you will have instant access to subjects and attendance registers!`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `_AttenSheet — Fast & Smart Attendance Management_`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(message);
      setCopiedInvite(true);
      toast("Class invite & signup link copied! Ready to paste in WhatsApp.", "success");
      setTimeout(() => setCopiedInvite(false), 3000);
    } catch {
      toast("Unable to copy to clipboard.", "error");
    }
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

  const cachedRole = profile?.role ?? getCachedSession()?.profile?.role ?? null;

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

        {cachedRole === "student" ? (
          <>
            {/* Student Analytics Skeletons */}
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <div className="card p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="skeleton h-5 w-36 rounded-lg" />
                  <div className="skeleton h-5 w-24 rounded-full" />
                </div>
                <div className="my-6 flex flex-col sm:flex-row items-center justify-around gap-6">
                  <div className="skeleton h-32 w-32 rounded-full" />
                  <div className="space-y-3 w-full sm:w-48">
                    <div className="skeleton h-8 w-full rounded-xl" />
                    <div className="skeleton h-8 w-full rounded-xl" />
                    <div className="skeleton h-8 w-full rounded-xl" />
                  </div>
                </div>
                <div className="skeleton h-4 w-48 rounded" />
              </div>

              <div className="card p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="skeleton h-5 w-44 rounded-lg" />
                    <div className="skeleton h-7 w-7 rounded-lg" />
                  </div>
                  <div className="mt-6 skeleton h-3 w-full rounded-full" />
                  <div className="mt-4 skeleton h-20 w-full rounded-xl" />
                </div>
                <div className="mt-6 flex justify-between gap-2">
                  <div className="skeleton h-12 flex-1 rounded-xl" />
                  <div className="skeleton h-12 flex-1 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Student Subjects Skeleton */}
            <div className="mt-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="skeleton h-6 w-44 rounded-lg" />
                  <div className="mt-1 skeleton h-4 w-72 rounded-md" />
                </div>
                <div className="skeleton h-9 w-64 rounded-xl" />
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="skeleton h-5 w-32 rounded" />
                      <div className="skeleton h-5 w-16 rounded-full" />
                    </div>
                    <div className="skeleton h-3.5 w-40 rounded" />
                    <div className="skeleton h-2 w-full rounded-full" />
                    <div className="pt-3 border-t border-[var(--border)] flex justify-between items-center">
                      <div className="skeleton h-3.5 w-24 rounded" />
                      <div className="skeleton h-3.5 w-20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </main>
    );
  }

  // Computed values for student analytics
  const overallTotal = attendanceSummary.total;
  const overallPresent = attendanceSummary.present;
  const overallAbsent = Math.max(0, overallTotal - overallPresent);
  const overallRate = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0;

  const maxCanMiss = overallTotal > 0 && overallRate >= 75 
    ? Math.max(0, Math.floor(overallPresent / 0.75 - overallTotal))
    : 0;

  const classesNeeded = overallTotal > 0 && overallRate < 75
    ? Math.max(0, Math.ceil(3 * overallTotal - 4 * overallPresent))
    : 0;

  const studentSubjectList = subjects.map((subject) => {
    const subjectRecords = allAttendance.filter((r) => r.subjectId === subject.id);
    const sTotal = subjectRecords.length;
    const sPresent = subjectRecords.filter((r) => r.present).length;
    const sAbsent = sTotal - sPresent;
    const sRate = sTotal > 0 ? Math.round((sPresent / sTotal) * 100) : null;
    const assignedTeacher = subject.teacherName ?? members.find((m) => m.uid === subject.teacherUid)?.fullName;

    return {
      ...subject,
      assignedTeacher,
      totalClasses: sTotal,
      presentClasses: sPresent,
      absentClasses: sAbsent,
      rate: sRate,
    };
  });

  const filteredStudentSubjects = studentSubjectList.filter((subject) => {
    const matchesFilter =
      subjectFilter === "all" ||
      (subjectFilter === "eligible" && subject.rate !== null && subject.rate >= 75) ||
      (subjectFilter === "short" && subject.rate !== null && subject.rate < 75);

    const matchesSearch =
      !subjectSearch ||
      subject.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
      (subject.assignedTeacher && subject.assignedTeacher.toLowerCase().includes(subjectSearch.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

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
        pendingRequest ? (
          <div className="mt-8">
            <PendingRequestCard request={pendingRequest} onRefresh={loadWorkspace} />
          </div>
        ) : (
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
            {profile?.role === "cr" ? (
              <div className="mt-6">
                <Link
                  href="/cr/setup"
                  className="button-primary"
                >
                  <span>Set up class</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="mt-6">
                <Link
                  href="/join"
                  className="button-primary"
                >
                  <span>Join a class</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        )
      ) : profile?.role === "student" ? (
        <>
          {/* Student Dedicated Attendance Analytics Section */}
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {/* Overall Attendance Donut Card */}
            <div className="card p-6 flex flex-col justify-between relative overflow-hidden border-[var(--border-hover)]">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
                  <h2 className="text-sm font-bold text-white">Attendance Performance</h2>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  overallTotal === 0
                    ? "bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-muted)]"
                    : overallRate >= 75
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : overallRate >= 65
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}>
                  {overallTotal === 0 ? (
                    "No Data"
                  ) : overallRate >= 75 ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Good Standing (≥75%)</span>
                    </>
                  ) : overallRate >= 65 ? (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                      <span>Borderline Risk (65–74%)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                      <span>Critical Deficit (&lt;65%)</span>
                    </>
                  )}
                </span>
              </div>

              {/* Donut Gauge & Metrics Row */}
              <div className="my-6 flex flex-col sm:flex-row items-center justify-around gap-6">
                {/* Circular SVG Donut */}
                <div className="relative flex items-center justify-center flex-none">
                  <svg className="h-36 w-36 -rotate-90 transform" viewBox="0 0 110 110">
                    <circle
                      cx="55"
                      cy="55"
                      r={46}
                      className="text-[var(--surface-elevated)] stroke-current"
                      strokeWidth="9"
                      fill="transparent"
                    />
                    <circle
                      cx="55"
                      cy="55"
                      r={46}
                      stroke={overallTotal === 0 ? "#4b5563" : overallRate >= 75 ? "#10b981" : overallRate >= 65 ? "#f59e0b" : "#f43f5e"}
                      strokeWidth="9"
                      strokeDasharray={2 * Math.PI * 46}
                      strokeDashoffset={overallTotal > 0 ? (2 * Math.PI * 46) - (overallRate / 100) * (2 * Math.PI * 46) : 2 * Math.PI * 46}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black tracking-tight text-white">
                      {overallTotal > 0 ? `${overallRate}%` : "0%"}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Attended
                    </span>
                  </div>
                </div>

                {/* Summary Breakdown Pills */}
                <div className="space-y-2.5 w-full sm:w-56">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-xs text-[var(--text-secondary)]">Present Sessions</span>
                    </div>
                    <span className="text-xs font-bold text-white">{overallPresent}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      <span className="text-xs text-[var(--text-secondary)]">Absent Sessions</span>
                    </div>
                    <span className="text-xs font-bold text-white">{overallAbsent}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                      <span className="text-xs text-[var(--text-secondary)]">Total Classes</span>
                    </div>
                    <span className="text-xs font-bold text-white">{overallTotal}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                <span>Semester attendance records</span>
                <Link href="/history" className="text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-medium">
                  <span>Full Log</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* 75% Target & Safety Margin Card */}
            <div className="card p-6 flex flex-col justify-between relative overflow-hidden border-[var(--border-hover)]">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-[var(--accent)]" />
                    <h2 className="text-sm font-bold text-white">University 75% Requirement</h2>
                  </div>
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Target: 75%</span>
                </div>

                {/* Progress Bar vs 75% Target Line */}
                <div className="mt-5">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-[var(--text-secondary)]">Progress towards criteria</span>
                    <span className="font-bold text-white">{overallRate}% / 75%</span>
                  </div>
                  <div className="relative h-3 w-full rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        overallTotal === 0
                          ? "bg-transparent"
                          : overallRate >= 75
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                          : overallRate >= 65
                          ? "bg-gradient-to-r from-amber-500 to-amber-400"
                          : "bg-gradient-to-r from-rose-500 to-rose-400"
                      }`}
                      style={{ width: `${Math.min(100, overallRate)}%` }}
                    />
                    {/* 75% target marker */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-sm"
                      style={{ left: "75%" }}
                      title="75% Minimum Exam Eligibility Threshold"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] mt-1.5">
                    <span>0%</span>
                    <span className="font-semibold text-white">75% (Target)</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Action Guidance Callout */}
                <div className={`mt-5 rounded-xl border p-4 ${
                  overallTotal === 0
                    ? "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--text-secondary)]"
                    : overallRate >= 75
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-200"
                    : "bg-rose-500/10 border-rose-500/25 text-rose-200"
                }`}>
                  {overallTotal === 0 ? (
                    <p className="text-xs leading-relaxed">
                      No sessions have been recorded for your class yet. Once your instructors start marking attendance, your safety margin and eligibility guidance will calculate live.
                    </p>
                  ) : overallRate >= 75 ? (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 flex-none" />
                        <span>Safe Attendance Margin</span>
                      </div>
                      <p className="mt-1.5 text-xs text-emerald-200/90 leading-relaxed">
                        You can afford to miss up to <strong className="text-white font-extrabold text-sm">{maxCanMiss}</strong> more {maxCanMiss === 1 ? "class" : "classes"} while maintaining ≥75% exam eligibility.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                        <AlertTriangle className="h-4 w-4 flex-none" />
                        <span>Attendance Deficit Warning</span>
                      </div>
                      <p className="mt-1.5 text-xs text-rose-200/90 leading-relaxed">
                        You need to attend the next <strong className="text-white font-extrabold text-sm">{classesNeeded}</strong> consecutive {classesNeeded === 1 ? "class" : "classes"} without absence to regain the 75% exam qualification.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[var(--border)] grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase">Classes Held</p>
                  <p className="text-sm font-bold text-white mt-0.5">{overallTotal}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase">Exam Status</p>
                  <p className={`text-sm font-bold mt-0.5 ${overallRate >= 75 ? "text-emerald-400" : "text-rose-400"}`}>
                    {overallTotal === 0 ? "N/A" : overallRate >= 75 ? "Eligible" : "Deficit"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase">Margin / Gap</p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {overallTotal === 0 ? "0%" : `${overallRate >= 75 ? `+${overallRate - 75}%` : `${overallRate - 75}%`}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Subject-Wise Performance Section */}
          <section className="mt-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Subject Performance</h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Track your attendance records and eligibility across each enrolled subject.
                </p>
              </div>

              {/* Filter and search controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search subject or teacher..."
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="field pl-8 pr-3 py-1.5 text-xs w-full sm:w-52"
                  />
                </div>
                <div className="inline-flex rounded-xl bg-[var(--surface)] p-1 border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setSubjectFilter("all")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      subjectFilter === "all" ? "bg-[var(--accent)] text-black" : "text-[var(--text-secondary)] hover:text-white"
                    }`}
                  >
                    All ({studentSubjectList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectFilter("eligible")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      subjectFilter === "eligible" ? "bg-emerald-500 text-white" : "text-[var(--text-secondary)] hover:text-white"
                    }`}
                  >
                    ≥75% ({studentSubjectList.filter((s) => s.rate !== null && s.rate >= 75).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectFilter("short")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      subjectFilter === "short" ? "bg-rose-500 text-white" : "text-[var(--text-secondary)] hover:text-white"
                    }`}
                  >
                    &lt;75% ({studentSubjectList.filter((s) => s.rate !== null && s.rate < 75).length})
                  </button>
                </div>
              </div>
            </div>

            {/* Subject Cards Grid */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStudentSubjects.length ? (
                filteredStudentSubjects.map((sub) => {
                  const isSecondaryCrUser = isSecondaryCr;
                  return (
                    <div
                      key={sub.id}
                      className="card card-hover p-5 flex flex-col justify-between group transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--accent)] group-hover:border-[var(--border-hover)] flex-none">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          {sub.rate === null ? (
                            <span className="rounded-full bg-[var(--surface-hover)] border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                              No Classes Yet
                            </span>
                          ) : sub.rate >= 75 ? (
                            <span className="badge-present text-[10px] font-semibold">
                              {sub.rate}% · Good
                            </span>
                          ) : sub.rate >= 65 ? (
                            <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold">
                              {sub.rate}% · At Risk
                            </span>
                          ) : (
                            <span className="badge-absent text-[10px] font-semibold">
                              {sub.rate}% · Short
                            </span>
                          )}
                        </div>

                        <div className="mt-4">
                          <h3 className="text-base font-bold text-white group-hover:text-[var(--accent)] transition-colors">
                            {sub.name}
                          </h3>
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                            <GraduationCap className="h-3.5 w-3.5 text-[var(--text-muted)] flex-none" />
                            <span className="truncate">
                              {sub.assignedTeacher ? `Prof. ${sub.assignedTeacher}` : "Awaiting teacher assignment"}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-5">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-[11px] text-[var(--text-muted)]">Attendance Ratio</span>
                            <span className="font-bold text-white text-xs">
                              {sub.presentClasses} / {sub.totalClasses} classes
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                sub.rate === null
                                  ? "bg-transparent"
                                  : sub.rate >= 75
                                  ? "bg-emerald-500"
                                  : sub.rate >= 65
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${sub.rate ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                        <Link
                          href={`/history?subjectId=${sub.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:text-[var(--primary-hover)]"
                        >
                          <span>Subject Ledger</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>

                        {isSecondaryCrUser && (
                          <Link
                            href={`/attendance?classId=${classRecord.id}&subjectId=${sub.id}`}
                            className="rounded-lg bg-blue-500/15 border border-blue-500/30 px-2 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/25 transition-colors inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Take Attendance</span>
                          </Link>
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
                  <h3 className="mt-3 text-sm font-semibold text-white">
                    {subjectSearch || subjectFilter !== "all" ? "No matching subjects found" : "No subjects added yet"}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {subjectSearch || subjectFilter !== "all"
                      ? "Try clearing your search term or filter."
                      : "Your Class Representative has not created any subjects for this semester yet."}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Recent Attendance Activity Log for Student */}
          <section className="mt-10 card p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-[var(--accent)]" />
                <h2 className="text-sm font-bold text-white">Recent Attendance Activity</h2>
              </div>
              <Link href="/history" className="text-xs font-medium text-[var(--accent)] hover:underline">
                View full history →
              </Link>
            </div>
            <div className="mt-4 divide-y divide-[var(--border)]">
              {attendanceHistory.length ? (
                attendanceHistory.map((item, idx) => (
                  <div key={`${item.date}-${idx}`} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">{item.date}</span>
                    </div>
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
        </>
      ) : (
        /* CR & Teacher View */
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

          {/* Summary / Stat Cards (CR & Teacher) */}
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
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--text-muted)]">Share with class</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={shareClassInvite}
                    className="button-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 font-semibold shadow"
                    title="Copy full invite message with link and class details"
                  >
                    {copiedInvite ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Invite Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Share Invite</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={copyClassCode}
                    className="button-secondary text-xs py-1.5 px-2.5 inline-flex items-center gap-1.5 font-medium"
                    title="Copy class access code only"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
                        <span className="text-[var(--accent)]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Subjects Section (CR & Teacher) */}
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
                  const canAccessAttendance =
                    profile?.role === "cr" || isAssignedToCurrentTeacher;
                  const attendanceHref = `/attendance?classId=${classRecord.id}&subjectId=${subject.id}`;
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
                            <span>Take Attendance</span>
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

