"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { firebaseAuth } from "@/lib/firebase";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import { karachiDate } from "@/lib/domain";
import { ActionModal } from "@/components/ActionModal";
import { CustomSelect } from "@/components/CustomSelect";
import { useToast } from "@/components/ToastProvider";
import { 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Trash2, 
  Save, 
  FileSpreadsheet, 
  CheckCheck, 
  RotateCcw,
  Loader2,
  Check,
  X
} from "lucide-react";

type Student = { uid: string; fullName?: string; fatherName?: string; seatNumber?: string };
type Attendance = { studentUid: string; date: string; present: boolean };
type ClassData = { university?: string; department?: string; className?: string; section?: string; semester?: string };

function AttendanceContent() {
  const router = useRouter();
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
  const [canManage, setCanManage] = useState(false);
  const [isSecondaryCr, setIsSecondaryCr] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const params = useSearchParams();
  const rawClassId = params.get("classId");
  const rawSubjectId = params.get("subjectId");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(rawSubjectId);
  const classId = rawClassId || selectedClassId;
  const subjectId = selectedSubjectId || rawSubjectId;
  const [availableSubjects, setAvailableSubjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (rawSubjectId) {
      setSelectedSubjectId(rawSubjectId);
    }
  }, [rawSubjectId]);

  const handleSubjectChange = (newSubjectId: string) => {
    if (newSubjectId === subjectId) return;
    setSelectedSubjectId(newSubjectId);
    setSearch("");
    const targetClassId = classId || "";
    if (targetClassId) {
      router.replace(
        `/attendance?classId=${encodeURIComponent(targetClassId)}&subjectId=${encodeURIComponent(newSubjectId)}`
      );
    } else {
      router.replace(`/attendance?subjectId=${encodeURIComponent(newSubjectId)}`);
    }
  };

  useEffect(() => {
    if (!authReady) return;

    void (async () => {
      try {
        const response = await fetch("/api/dashboard", { headers: await authHeaders() });
        const result = await readApiResponse(response);
        if (response.ok && result.profile) {
          const prof = result.profile as { role?: string; isSecondaryCr?: boolean };
          if (prof.role === "student" && !prof.isSecondaryCr) {
            router.replace(`/history${rawSubjectId ? `?subjectId=${encodeURIComponent(rawSubjectId)}` : ""}`);
            return;
          }
        }
        if (response.ok && result.class) {
          const cls = result.class as { id: string };
          const subs = (result.subjects ?? []) as { id: string; name: string }[];
          setAvailableSubjects(subs);
          if (!classId) setSelectedClassId(cls.id);
          if (!subjectId && subs.length > 0) {
            setSelectedSubjectId(subs[0].id);
          } else if (subs.length === 0) {
            setMessage("No active subjects found. Ask your Class Representative to add or assign subjects.");
            setLoading(false);
          }
        }
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Unable to load subjects.");
        setLoading(false);
      }
    })();
  }, [authReady, router]);

  const load = useCallback(async () => {
    if (!classId || !subjectId) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `/api/attendance?classId=${encodeURIComponent(classId)}&subjectId=${encodeURIComponent(subjectId)}&date=${encodeURIComponent(date)}&all=true`,
        { headers: await authHeaders() }
      );
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Unable to load attendance."));
      if (result.isStudent === true) {
        router.replace(`/history${subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : ""}`);
        return;
      }
      const nextAttendance = (result.attendance ?? []) as Attendance[];
      setStudents((result.students ?? []) as Student[]);
      setAttendance(nextAttendance);
      setRecords(
        Object.fromEntries(
          nextAttendance.filter((item) => item.date === date).map((item) => [item.studentUid, item.present])
        )
      );
      setSubjectName(String((result.subject as { name?: string } | undefined)?.name ?? "Attendance"));
      setClassData((result.class ?? {}) as ClassData);
      setCanEdit(result.canEdit === true);
      setCanManage(result.canManage === true);
      setIsSecondaryCr(Boolean(result.isSecondaryCr));
      setMessage("");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to load attendance.";
      setMessage(text);
      toast(text, "error");
    } finally {
      setLoading(false);
    }
  }, [classId, subjectId, date, toast, router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => setAuthReady(Boolean(user)));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authReady || !classId || !subjectId) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [authReady, classId, subjectId, load]);

  const filteredStudents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) =>
      `${student.seatNumber ?? ""} ${student.fullName ?? ""}`.toLowerCase().includes(needle)
    );
  }, [students, search]);

  const dates = useMemo(() => [...new Set(attendance.map((item) => item.date))].sort(), [attendance]);
  const matrix = useMemo(() => {
    return students.map((student) => {
      const statuses = dates.map((day) =>
        attendance.find((item) => item.studentUid === student.uid && item.date === day)
      );
      return {
        student,
        statuses,
        present: statuses.filter((item) => item?.present).length,
        marked: statuses.filter(Boolean).length,
      };
    });
  }, [students, attendance, dates]);

  const presentCount = useMemo(() => {
    return students.filter((s) => records[s.uid] === true).length;
  }, [students, records]);

  // Bulk roll call helpers
  const markAll = (status: boolean) => {
    if (!canEdit) return;
    const next = { ...records };
    filteredStudents.forEach((student) => {
      next[student.uid] = status;
    });
    setRecords(next);
  };

  // Quick-mark student when pressing Enter on single search match
  const handleSearchEnter = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!canEdit) return;
    if (filteredStudents.length === 1) {
      const student = filteredStudents[0];
      setRecords((current) => ({
        ...current,
        [student.uid]: true,
      }));
      setSearch("");
      searchInputRef.current?.focus();
    }
  };

  async function save() {
    if (!classId || !subjectId) return;
    setBusy(true);
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: await authHeaders(true),
        body: JSON.stringify({
          classId,
          subjectId,
          date,
          records: students.map((student) => ({
            studentUid: student.uid,
            present: records[student.uid] === true,
          })),
        }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Unable to save attendance."));
      setConfirmSave(false);
      toast("Attendance saved and synchronized to Google Sheets.", "success");
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to save attendance.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDate() {
    if (!classId || !subjectId) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/attendance?classId=${encodeURIComponent(classId)}&subjectId=${encodeURIComponent(subjectId)}&date=${encodeURIComponent(date)}`,
        { method: "DELETE", headers: await authHeaders() }
      );
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Unable to delete attendance."));
      setConfirmDelete(false);
      toast("Attendance for this date was deleted and the sheet was synchronized.", "success");
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to delete attendance.", "error");
    } finally {
      setBusy(false);
    }
  }

  const today = karachiDate();
  const isToday = date === today;
  const headerSubtitle = `${classData.university ?? ""} · ${classData.department ?? ""} · ${classData.className ?? ""} · Section ${classData.section ?? ""} · ${classData.semester ?? ""}`;

  if (loading) {
    return <AttendanceSkeleton />;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </Link>
        <span className="text-[var(--text-muted)] text-xs">/</span>
        <span className="text-xs font-semibold text-[var(--accent)]">{subjectName}</span>
      </div>

      {/* Header Section */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {subjectName} Roll Call
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
            {headerSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {availableSubjects.length > 1 && (
            <div className="w-48">
              <CustomSelect
                value={subjectId ?? ""}
                options={availableSubjects.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Switch subject"
                onChange={handleSubjectChange}
              />
            </div>
          )}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="badge-present">{presentCount} Present</span>
            <span className="badge-absent">{students.length - presentCount} Absent</span>
          </div>
        </div>
      </div>

      {/* Lock / Editable Status Banner */}
      <div className={`mt-6 flex items-start gap-3 rounded-xl border p-4 text-xs sm:text-sm ${
        canEdit 
          ? "border-[var(--border-hover)] bg-[var(--accent-soft)] text-[var(--text-primary)]" 
          : "border-amber-500/20 bg-amber-500/10 text-amber-200"
      }`}>
        {canEdit ? (
          <CheckCircle2 className="h-4 w-4 flex-none text-[var(--accent)] mt-0.5" />
        ) : (
          <Lock className="h-4 w-4 flex-none text-amber-400 mt-0.5" />
        )}
        <div className="flex-1">
          <p className="font-semibold text-white">
            {canEdit
              ? isToday
                ? "Active Daily Register"
                : "Past Unrecorded Register"
              : "Register Permanently Locked"}
          </p>
          <p className="mt-0.5 text-xs opacity-85">
            {canEdit
              ? isToday
                ? "Today's roll-call is open for editing until midnight Asia/Karachi."
                : "This past date has not been marked yet and can be saved once."
              : "This date has already been committed to the master register and cannot be altered."}
          </p>
        </div>
      </div>

      {message && <p className="mt-4 text-xs text-[var(--text-secondary)]">{message}</p>}

      {/* Roll Call Quick Actions (Mark all / Clear all) */}
      {canEdit && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => markAll(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-white transition hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]"
            >
              <CheckCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>Mark all present</span>
            </button>
            <button
              type="button"
              onClick={() => markAll(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)] hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear all</span>
            </button>
          </div>

          <div className="text-xs text-[var(--text-muted)]">
            Showing {filteredStudents.length} of {students.length} students
          </div>
        </div>
      )}

      {/* Search Bar Box & Date Selector (Positioned right above table headers and below Mark all/Clear all) */}
      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Box with Quick-Mark Enter */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                handleSearchEnter(event);
              }
            }}
            enterKeyHint="go"
            className="field pl-9 pr-7 py-2 text-xs"
            placeholder="Search student or seat # (Enter to mark)"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Date Selector & Today Shortcut */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative">
            <input
              type="date"
              value={date}
              max={today}
              onChange={(event) => setDate(event.target.value)}
              className="field py-1.5 px-3 text-xs w-36 cursor-pointer font-mono"
            />
          </div>
          {!isToday && (
            <button
              type="button"
              onClick={() => setDate(today)}
              className="button-secondary text-xs py-1.5 px-3 whitespace-nowrap"
              title="Jump to today"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Main Student Attendance List / Table */}
      <section className="mt-4 card overflow-hidden">
        {/* Desktop Table View (hidden on small mobile screens) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-secondary)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <tr>
                <th className="w-28 px-6 py-4">Status</th>
                <th className="w-36 px-6 py-4">Seat Number</th>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Father Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredStudents.length ? (
                filteredStudents.map((student) => {
                  const isPresent = records[student.uid] === true;
                  return (
                    <tr
                      key={student.uid}
                      className={`transition-colors ${isPresent ? "bg-[var(--accent-soft)]/20 hover:bg-[var(--accent-soft)]/30" : "hover:bg-[var(--surface-hover)]"}`}
                    >
                      <td className="px-6 py-3.5">
                        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                          <div
                            role="checkbox"
                            aria-checked={isPresent}
                            aria-label={`Mark ${student.fullName ?? student.uid} present`}
                            tabIndex={canEdit ? 0 : -1}
                            onKeyDown={(e) => {
                              if (canEdit && (e.key === " " || e.key === "Enter")) {
                                e.preventDefault();
                                setRecords((current) => ({
                                  ...current,
                                  [student.uid]: !isPresent,
                                }));
                              }
                            }}
                            onClick={() => {
                              if (!canEdit) return;
                              setRecords((current) => ({
                                ...current,
                                [student.uid]: !isPresent,
                              }));
                            }}
                            className={`custom-checkbox ${isPresent ? "is-checked" : ""} ${!canEdit ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <Check className="custom-checkbox-icon" />
                          </div>
                          <span className={`text-xs font-semibold transition-colors duration-150 ${isPresent ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
                            {isPresent ? "Present" : "Absent"}
                          </span>
                        </label>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs font-bold text-white">
                        {student.seatNumber ?? "-"}
                      </td>
                      <td className="px-6 py-3.5 font-medium text-[var(--text-primary)]">
                        {student.fullName ?? "Unnamed student"}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-[var(--text-secondary)]">
                        {student.fatherName ?? "-"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-xs text-[var(--text-muted)]">
                    No students match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile-First Card View (visible on < md) */}
        <div className="block md:hidden divide-y divide-[var(--border)]">
          {filteredStudents.length ? (
            filteredStudents.map((student) => {
              const isPresent = records[student.uid] === true;
              return (
                <div
                  key={student.uid}
                  className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                    isPresent ? "bg-[var(--accent-soft)]/20" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[var(--surface-elevated)] border border-[var(--border)] px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
                        {student.seatNumber ?? "-"}
                      </span>
                      <p className="text-sm font-semibold text-white truncate">
                        {student.fullName ?? "Unnamed student"}
                      </p>
                    </div>
                    {student.fatherName && (
                      <p className="mt-1 text-xs text-[var(--text-muted)] truncate">
                        S/O {student.fatherName}
                      </p>
                    )}
                  </div>

                  {/* Touch-Friendly Tap Toggle Button */}
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() =>
                      setRecords((current) => ({
                        ...current,
                        [student.uid]: !isPresent,
                      }))
                    }
                    className={`flex-none h-11 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isPresent
                        ? "bg-[var(--primary)] text-[#07110D] shadow-md shadow-emerald-950/40"
                        : "border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {isPresent ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>PRESENT</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-[var(--text-muted)]" />
                        <span>ABSENT</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              No students match your search criteria.
            </div>
          )}
        </div>

        {/* Footer & Actions Bar */}
        <div className="flex flex-col gap-3 border-t border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between bg-[var(--bg-secondary)]/60">
          <div className="text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-white">{presentCount}</span> marked present out of{" "}
            <span className="font-semibold text-white">{students.length}</span> total students
          </div>

          <div className="flex items-center gap-2">
            {canManage && attendance.some((item) => item.date === date) && (
              <button
                type="button"
                disabled={busy || loading}
                onClick={() => setConfirmDelete(true)}
                className="button-danger text-xs py-2.5 px-3.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete date</span>
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                disabled={busy || loading}
                onClick={() => setConfirmSave(true)}
                className="button-primary text-xs py-2.5 px-4"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save attendance</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Google Sheets Blueprint Register (Hidden for Secondary CR) */}
      {!isSecondaryCr && (
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Google Sheets Register Blueprint</span>
              </div>
              <h2 className="mt-1 text-xl font-bold text-white">
                {subjectName} Master Sheet
              </h2>
            </div>
            <span className="badge-neutral text-[11px] hidden sm:inline-flex">
              Auto-synced
            </span>
          </div>

          <div className="mt-4 card overflow-hidden border border-[var(--border-hover)] bg-[#0A1612]">
            <div className="p-3.5 border-b border-[var(--border)] bg-[#07110D] text-xs text-[var(--text-muted)] truncate">
              {headerSubtitle}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[10px] uppercase font-bold text-[var(--text-muted)]">
                    <th className="px-4 py-3 whitespace-nowrap">Seat #</th>
                    <th className="px-4 py-3 whitespace-nowrap">Student Name</th>
                    <th className="px-4 py-3 whitespace-nowrap">Father Name</th>
                    {dates.map((day) => (
                      <th key={day} className="px-3 py-3 whitespace-nowrap text-center">
                        {day}
                      </th>
                    ))}
                    <th className="px-4 py-3 whitespace-nowrap text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {matrix.map(({ student, statuses, present, marked }) => (
                    <tr key={student.uid} className="hover:bg-[var(--surface-hover)]">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-white">
                        {student.seatNumber ?? "-"}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[var(--text-primary)] whitespace-nowrap">
                        {student.fullName ?? "Unnamed"}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)] whitespace-nowrap">
                        {student.fatherName ?? "-"}
                      </td>
                      {statuses.map((item, index) => (
                        <td key={`${student.uid}-${index}`} className="px-3 py-2.5 text-center">
                          {item ? (
                            item.present ? (
                              <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" title="Present" />
                            ) : (
                              <span className="inline-block h-2 w-2 rounded-full bg-red-400" title="Absent" />
                            )
                          ) : (
                            <span className="text-[var(--text-muted)]">-</span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-right font-bold text-[var(--accent)]">
                        {present}/{marked}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Modal Confirmations */}
      {confirmSave && (
        <ActionModal
          title="Save Attendance?"
          description={`Commit roll call for ${date}. This will immediately update the Google Sheet workbook and synchronize student statistics.`}
          confirmLabel="Save Attendance"
          onClose={() => setConfirmSave(false)}
          onConfirm={() => void save()}
        />
      )}

      {confirmDelete && (
        <ActionModal
          title="Delete Attendance Date?"
          description={`Permanently remove all attendance records for ${date}? This removes the date column from Google Sheets.`}
          confirmLabel="Delete Date"
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => void deleteDate()}
        />
      )}
    </main>
  );
}

function AttendanceSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <div className="skeleton h-3.5 w-16 rounded" />
        <span className="text-[var(--text-muted)] text-xs">/</span>
        <div className="skeleton h-3.5 w-24 rounded" />
      </div>

      {/* Header Section Skeleton */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="skeleton h-8 w-56 sm:w-72 rounded-lg" />
          <div className="skeleton h-3.5 w-48 sm:w-80 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="skeleton h-9 w-36 sm:w-44 rounded-xl" />
          <div className="skeleton h-6 w-20 rounded-full" />
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
      </div>

      {/* Status Banner Skeleton */}
      <div className="mt-6 skeleton h-16 w-full rounded-xl" />

      {/* Roll Call Quick Actions Skeleton */}
      <div className="mt-6 skeleton h-12 w-full rounded-xl" />

      {/* Search Bar & Date Selector Skeleton */}
      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="skeleton h-9 w-full sm:max-w-md rounded-xl" />
        <div className="skeleton h-9 w-36 sm:w-48 rounded-xl" />
      </div>

      {/* Table Skeleton */}
      <section className="mt-4 card overflow-hidden p-4 sm:p-6 space-y-3">
        <div className="skeleton h-10 w-full rounded-lg" />
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border)]">
            <div className="skeleton h-6 w-16 rounded-md" />
            <div className="skeleton h-4 w-28 rounded" />
            <div className="skeleton h-4 w-40 rounded" />
            <div className="skeleton h-4 w-32 rounded" />
          </div>
        ))}
      </section>
    </main>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<AttendanceSkeleton />}>
      <AttendanceContent />
    </Suspense>
  );
}

