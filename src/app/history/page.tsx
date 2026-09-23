"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { firebaseAuth } from "@/lib/firebase";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import { 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  BookOpen, 
  Layers, 
  Clock, 
  TrendingUp, 
  AlertTriangle 
} from "lucide-react";
import { CustomSelect } from "@/components/CustomSelect";

type AttendanceRecord = {
  id: string;
  date: string;
  subjectId: string;
  subjectName: string;
  present: boolean;
};

type Subject = {
  id: string;
  name: string;
};

type Summary = {
  total: number;
  present: number;
  absent: number;
  percentage: number;
};

type StudentInfo = {
  uid: string;
  fullName?: string;
  seatNumber?: string;
};

type ClassInfo = {
  university?: string;
  department?: string;
  className?: string;
  section?: string;
  semester?: string;
};

function StudentHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get("subjectId") ?? "all";

  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, present: 0, absent: 0, percentage: 100 });
  const [student, setStudent] = useState<StudentInfo>({ uid: "" });
  const [classData, setClassData] = useState<ClassInfo>({});

  // Filter States
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent">("all");
  const [timeframeFilter, setTimeframeFilter] = useState<"all" | "month" | "week">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"timeline" | "blueprint">("timeline");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) router.replace("/login");
      else setAuthReady(true);
    });
    return unsubscribe;
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/attendance?all=true", { headers: await authHeaders() });
      const result = await readApiResponse(response);
      if (response.ok && result.isStudent) {
        setAttendance((result.attendance ?? []) as AttendanceRecord[]);
        setSubjects((result.subjects ?? []) as Subject[]);
        if (result.summary) setSummary(result.summary as Summary);
        if (result.student) setStudent(result.student as StudentInfo);
        if (result.class) setClassData(result.class as ClassInfo);
      }
    } catch (err) {
      console.error("Failed to load student attendance history", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authReady) {
      loadData();
    }
  }, [authReady, loadData]);

  // Compute date thresholds
  const oneWeekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  }, []);
  const oneMonthAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  }, []);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return attendance.filter((item) => {
      if (selectedSubject !== "all" && item.subjectId !== selectedSubject) {
        return false;
      }
      if (statusFilter === "present" && !item.present) return false;
      if (statusFilter === "absent" && item.present) return false;
      if (timeframeFilter === "week" && item.date < oneWeekAgo) return false;
      if (timeframeFilter === "month" && item.date < oneMonthAgo) return false;
      if (searchQuery.trim()) {
        if (item.date !== searchQuery) return false;
      }
      return true;
    });
  }, [attendance, selectedSubject, statusFilter, timeframeFilter, searchQuery, oneWeekAgo, oneMonthAgo]);

  // Group by Date for the Date-wise timeline view
  const groupedByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    const sorted = [...filteredRecords].sort((a, b) => b.date.localeCompare(a.date));
    for (const record of sorted) {
      const list = map.get(record.date) ?? [];
      list.push(record);
      map.set(record.date, list);
    }
    return Array.from(map.entries()).map(([date, records]) => ({ date, records }));
  }, [filteredRecords]);

  // Blueprint: Subject Matrix breakdown
  const subjectMatrix = useMemo(() => {
    return subjects.map((sub) => {
      const records = attendance.filter((r) => r.subjectId === sub.id);
      const total = records.length;
      const present = records.filter((r) => r.present).length;
      const absent = total - present;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 100;
      return {
        ...sub,
        total,
        present,
        absent,
        percentage,
        recent: records.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
      };
    });
  }, [subjects, attendance]);

  // Dynamic filtered summary
  const currentSummary = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r) => r.present).length;
    const absent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 100;
    return { total, present, absent, percentage };
  }, [filteredRecords]);

  if (loading) {
    return <HistorySkeleton />;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-28">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            My Attendance History
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
            {classData.university ? `${classData.university} · ${classData.department ?? ""} · Section ${classData.section ?? ""}` : "Personal lecture attendance record"}
          </p>
        </div>

        {/* Student Badge */}
        {student.fullName && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-lg">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)] border border-[var(--border-hover)]">
              {student.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">
                {student.fullName}
              </p>
              <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
                Seat #: {student.seatNumber || "Unassigned"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Overall Percentage */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="text-xs font-medium">Attendance Rate</span>
            <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div className="mt-3">
            <span className={`text-2xl sm:text-3xl font-extrabold ${
              currentSummary.percentage >= 75 ? "text-emerald-400" : currentSummary.percentage >= 60 ? "text-amber-400" : "text-red-400"
            }`}>
              {loading ? "--" : `${currentSummary.percentage}%`}
            </span>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              {currentSummary.percentage >= 75 ? "Eligible for exams" : "Below 75% requirement"}
            </p>
          </div>
        </div>

        {/* Attended */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="text-xs font-medium">Lectures Attended</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {loading ? "--" : currentSummary.present}
            </span>
            <p className="text-[11px] text-emerald-400 mt-1">
              Recorded presents
            </p>
          </div>
        </div>

        {/* Missed */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="text-xs font-medium">Lectures Missed</span>
            <XCircle className="h-4 w-4 text-red-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {loading ? "--" : currentSummary.absent}
            </span>
            <p className="text-[11px] text-red-400 mt-1">
              Total absents
            </p>
          </div>
        </div>

        {/* Total Lectures */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="text-xs font-medium">Total Classes Held</span>
            <BookOpen className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {loading ? "--" : currentSummary.total}
            </span>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Across enrolled subjects
            </p>
          </div>
        </div>
      </div>

      {/* View Switcher & Filter Toolbar */}
      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* View Mode Toggle with Centered Sliding Pill */}
          <div className="relative flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1 w-full sm:w-auto max-w-xs mx-auto sm:mx-0">
            {/* Sliding indicator */}
            <div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-[var(--primary)] shadow-md transition-all duration-300 ease-out pointer-events-none"
              style={{
                left: activeTab === "timeline" ? "4px" : "calc(50%)",
              }}
            />
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={`relative z-10 flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors duration-200 ${
                activeTab === "timeline"
                  ? "text-[#07110D]"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Date Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("blueprint")}
              className={`relative z-10 flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors duration-200 ${
                activeTab === "blueprint"
                  ? "text-[#07110D]"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Sheet Blueprint</span>
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div className="text-center sm:text-right text-xs text-[var(--text-muted)]">
            Showing <strong className="text-white">{filteredRecords.length}</strong> attendance records
          </div>
        </div>

        {/* Filter Bar */}
        <div className="card p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-center">
            {/* Date Search Input */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="date"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field pl-9 text-xs w-full bg-transparent [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>

            {/* Custom Subject Selector */}
            <div>
              <CustomSelect
                value={selectedSubject}
                onChange={(val) => setSelectedSubject(val)}
                placeholder="All Subjects"
                options={[
                  { value: "all", label: "All Subjects" },
                  ...subjects.map((sub) => ({
                    value: sub.id,
                    label: sub.name,
                  })),
                ]}
              />
            </div>

            {/* Status Filter with Sliding Pill */}
            <div className="relative flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1">
              {/* Sliding pill indicator */}
              <div
                className={`absolute top-1 bottom-1 w-[calc(33.333%-2.67px)] rounded-lg shadow-sm transition-all duration-300 ease-out pointer-events-none ${
                  statusFilter === "present"
                    ? "bg-emerald-500/25 border border-emerald-500/40"
                    : statusFilter === "absent"
                    ? "bg-red-500/25 border border-red-500/40"
                    : "bg-[var(--surface)] border border-white/10"
                }`}
                style={{
                  left:
                    statusFilter === "all"
                      ? "4px"
                      : statusFilter === "present"
                      ? "calc(33.333% + 1.33px)"
                      : "calc(66.666% - 1.33px)",
                }}
              />
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`relative z-10 flex-1 py-2 text-center text-xs font-medium transition-colors duration-200 ${
                  statusFilter === "all" ? "text-white font-semibold" : "text-[var(--text-muted)] hover:text-white"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("present")}
                className={`relative z-10 flex-1 py-2 text-center text-xs font-medium transition-colors duration-200 ${
                  statusFilter === "present" ? "text-emerald-300 font-semibold" : "text-[var(--text-muted)] hover:text-white"
                }`}
              >
                Present
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("absent")}
                className={`relative z-10 flex-1 py-2 text-center text-xs font-medium transition-colors duration-200 ${
                  statusFilter === "absent" ? "text-red-300 font-semibold" : "text-[var(--text-muted)] hover:text-white"
                }`}
              >
                Absent
              </button>
            </div>

            {/* Timeframe Filter with Sliding Pill */}
            <div className="relative flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1">
              {/* Sliding pill indicator */}
              <div
                className="absolute top-1 bottom-1 w-[calc(33.333%-2.67px)] rounded-lg bg-[var(--surface)] border border-white/10 shadow-sm transition-all duration-300 ease-out pointer-events-none"
                style={{
                  left:
                    timeframeFilter === "all"
                      ? "4px"
                      : timeframeFilter === "month"
                      ? "calc(33.333% + 1.33px)"
                      : "calc(66.666% - 1.33px)",
                }}
              />
              <button
                type="button"
                onClick={() => setTimeframeFilter("all")}
                className={`relative z-10 flex-1 py-2 text-center text-xs font-medium transition-colors duration-200 ${
                  timeframeFilter === "all" ? "text-white font-semibold" : "text-[var(--text-muted)] hover:text-white"
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setTimeframeFilter("month")}
                className={`relative z-10 flex-1 py-2 text-center text-xs font-medium transition-colors duration-200 ${
                  timeframeFilter === "month" ? "text-white font-semibold" : "text-[var(--text-muted)] hover:text-white"
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeframeFilter("week")}
                className={`relative z-10 flex-1 py-2 text-center text-xs font-medium transition-colors duration-200 ${
                  timeframeFilter === "week" ? "text-white font-semibold" : "text-[var(--text-muted)] hover:text-white"
                }`}
              >
                7 Days
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-6">
        {activeTab === "timeline" ? (
          /* TAB 1: Date-wise Timeline View */
          groupedByDate.length > 0 ? (
            <div className="space-y-4">
              {groupedByDate.map(({ date, records }) => {
                const dateObj = new Date(date + "T00:00:00");
                const formattedDate = dateObj.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                const dayPresent = records.filter((r) => r.present).length;
                const dayAbsent = records.length - dayPresent;

                return (
                  <div key={date} className="card overflow-hidden transition hover:border-[var(--border-hover)]">
                    {/* Date Header */}
                    <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)]/50 px-4 py-3 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="h-4 w-4 text-[var(--accent)]" />
                        <span className="text-sm font-bold text-white">
                          {formattedDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {dayPresent > 0 && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                            {dayPresent} Present
                          </span>
                        )}
                        {dayAbsent > 0 && (
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-400 border border-red-500/20">
                            {dayAbsent} Absent
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Subject Rows for this date */}
                    <div className="divide-y divide-[var(--border)]">
                      {records.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between px-4 py-3.5 sm:px-6 transition hover:bg-[var(--surface-hover)]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]">
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {record.subjectName}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                Class Attendance Recorded
                              </p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div>
                            {record.present ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Present</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Absent</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <Clock className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
              <h3 className="mt-3 text-sm font-bold text-white">No attendance records found</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                No attendance entries match your active filters. Try adjusting your subject or date selection.
              </p>
            </div>
          )
        ) : (
          /* TAB 2: Sheet Blueprint Matrix View */
          <div className="space-y-4">
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      <th className="px-5 py-3.5">Subject</th>
                      <th className="px-4 py-3.5 text-center">Classes Held</th>
                      <th className="px-4 py-3.5 text-center">Attended</th>
                      <th className="px-4 py-3.5 text-center">Missed</th>
                      <th className="px-4 py-3.5 text-center">Percentage</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Recent Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {subjectMatrix.map((sub) => (
                      <tr key={sub.id} className="transition hover:bg-[var(--surface-hover)]">
                        <td className="px-5 py-4 font-semibold text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                            <span>{sub.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-white">
                          {sub.total}
                        </td>
                        <td className="px-4 py-4 text-center font-mono font-bold text-emerald-400">
                          {sub.present}
                        </td>
                        <td className="px-4 py-4 text-center font-mono font-bold text-red-400">
                          {sub.absent}
                        </td>
                        <td className="px-4 py-4 text-center font-mono font-extrabold">
                          <span className={sub.percentage >= 75 ? "text-emerald-400" : "text-amber-400"}>
                            {sub.percentage}%
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {sub.percentage >= 75 ? (
                            <span className="badge-present text-[11px]">
                              Good Standing
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Low Attendance</span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {sub.recent.length > 0 ? (
                              sub.recent.map((rec) => (
                                <span
                                  key={rec.id}
                                  title={`${rec.date}: ${rec.present ? "Present" : "Absent"}`}
                                  className={`grid h-5 w-5 place-items-center rounded text-[10px] font-bold ${
                                    rec.present
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                                  }`}
                                >
                                  {rec.present ? "P" : "A"}
                                </span>
                              ))
                            ) : (
                              <span className="text-[var(--text-muted)] text-[11px]">No classes yet</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function HistorySkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-28">
      {/* Top Header Skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="skeleton h-4 w-32 rounded-md" />
          <div className="skeleton h-8 w-64 sm:w-80 rounded-xl" />
          <div className="skeleton h-4 w-72 rounded-md" />
        </div>

        {/* Student Profile Card Skeleton */}
        <div className="card p-3.5 flex items-center gap-3 w-full sm:w-60">
          <div className="skeleton h-10 w-10 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <div className="skeleton h-4 w-28 rounded-md" />
            <div className="skeleton h-3 w-20 rounded-md" />
          </div>
        </div>
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="card p-4 sm:p-5 flex flex-col justify-between h-[120px]">
            <div className="flex items-center justify-between">
              <div className="skeleton h-3.5 w-24 rounded-md" />
              <div className="skeleton h-4 w-4 rounded-md" />
            </div>
            <div className="space-y-1">
              <div className="skeleton h-8 w-16 rounded-lg" />
              <div className="skeleton h-3 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* View Switcher & Stats Skeleton */}
      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="skeleton h-10 w-full sm:w-64 max-w-xs mx-auto sm:mx-0 rounded-xl" />
          <div className="skeleton h-4 w-44 rounded-md mx-auto sm:mx-0" />
        </div>

        {/* Filter Bar Skeleton */}
        <div className="card p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="skeleton h-10 w-full rounded-xl" />
            <div className="skeleton h-10 w-full rounded-xl" />
            <div className="skeleton h-10 w-full rounded-xl" />
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* Main Content Area Skeleton */}
      <div className="mt-6 space-y-4">
        {[1, 2, 3].map((group) => (
          <div key={group} className="card overflow-hidden">
            {/* Group Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)]/50 px-4 py-3 sm:px-6">
              <div className="skeleton h-5 w-44 rounded-md" />
              <div className="skeleton h-5 w-24 rounded-full" />
            </div>
            {/* Rows */}
            <div className="divide-y divide-[var(--border)]/40">
              {[1, 2].map((row) => (
                <div key={row} className="px-4 py-3.5 sm:px-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="skeleton h-9 w-9 rounded-xl" />
                    <div className="space-y-1.5">
                      <div className="skeleton h-4 w-36 rounded-md" />
                      <div className="skeleton h-3 w-24 rounded-md" />
                    </div>
                  </div>
                  <div className="skeleton h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <StudentHistoryContent />
    </Suspense>
  );
}
