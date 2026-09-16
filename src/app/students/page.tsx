"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import { useToast } from "@/components/ToastProvider";
import { ActionModal } from "@/components/ActionModal";
import { CustomSelect } from "@/components/CustomSelect";
import {
  ArrowLeft,
  Search,
  Users,
  ShieldCheck,
  UserCheck,
  User,
  GraduationCap,
  Sparkles,
  ArrowUpDown,
  MoreVertical,
  Edit3,
  UserPlus,
  UserMinus,
  Trash2,
  X,
  Loader2,
  Mail,
  AlertCircle,
  CheckCircle2,
  Plus
} from "lucide-react";

interface StudentItem {
  id: string;
  uid: string;
  fullName: string;
  fatherName: string;
  seatNumber: string;
  email: string;
  isPrimaryCr: boolean;
  isSecondaryCr: boolean;
  createdAt?: string;
}

interface ClassMetadata {
  id: string;
  className?: string;
  section?: string;
  department?: string;
  university?: string;
  semester?: string;
  crUid?: string;
}

type RoleFilter = "all" | "cr" | "secondary_cr" | "student";
type SortOption = "seat_asc" | "seat_desc" | "name_asc" | "name_desc";

export default function StudentsPage() {
  const router = useRouter();
  const toast = useToast();

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classData, setClassData] = useState<ClassMetadata | null>(null);
  const [secondaryCrUid, setSecondaryCrUid] = useState<string | null>(null);
  const [crSelfEnrolled, setCrSelfEnrolled] = useState<boolean>(true);
  const [isCr, setIsCr] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("seat_asc");

  // Selected student for Action Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [actionTab, setActionTab] = useState<"menu" | "edit" | "assign_cr" | "revoke_cr" | "remove">("menu");

  // Edit form state
  const [editForm, setEditForm] = useState({ fullName: "", seatNumber: "", fatherName: "" });
  const [submitting, setSubmitting] = useState(false);

  // CR Self-Enrollment modal state
  const [showSelfEnrollModal, setShowSelfEnrollModal] = useState(false);
  const [selfEnrollForm, setSelfEnrollForm] = useState({ seatNumber: "", fatherName: "", fullName: "" });

  async function loadData() {
    try {
      const response = await fetch("/api/students", { headers: await authHeaders() });
      const result = await readApiResponse(response);

      if (response.status === 403) {
        toast("Access restricted to Class Representatives and Teachers.", "error");
        router.replace("/dashboard");
        return;
      }

      if (!response.ok) {
        throw new Error(String(result.error ?? "Failed to load student roster."));
      }

      setStudents((result.students ?? []) as StudentItem[]);
      setClassData(result.class as ClassMetadata | null);
      setSecondaryCrUid((result.secondaryCrUid as string | null) ?? null);
      setCrSelfEnrolled(Boolean(result.crSelfEnrolled));
      setIsCr(Boolean(result.isCr));
      setIsTeacher(Boolean(result.isTeacher));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to load student roster.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) {
        router.replace("/login");
      } else {
        void loadData();
      }
    });
    return unsubscribe;
  }, [router]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // 1. Search filter (seat number, name, father name, email)
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.seatNumber.toLowerCase().includes(q) ||
          s.fullName.toLowerCase().includes(q) ||
          s.fatherName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }

    // 2. Role filter
    if (roleFilter === "cr") {
      result = result.filter((s) => s.isPrimaryCr);
    } else if (roleFilter === "secondary_cr") {
      result = result.filter((s) => s.isSecondaryCr);
    } else if (roleFilter === "student") {
      result = result.filter((s) => !s.isPrimaryCr && !s.isSecondaryCr);
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === "seat_asc") {
        return a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true });
      }
      if (sortBy === "seat_desc") {
        return b.seatNumber.localeCompare(a.seatNumber, undefined, { numeric: true });
      }
      if (sortBy === "name_asc") {
        return a.fullName.localeCompare(b.fullName);
      }
      if (sortBy === "name_desc") {
        return b.fullName.localeCompare(a.fullName);
      }
      return 0;
    });

    return result;
  }, [students, search, roleFilter, sortBy]);

  // Open modal for student
  const openActionModal = (student: StudentItem) => {
    setSelectedStudent(student);
    setActionTab("menu");
    setEditForm({
      fullName: student.fullName,
      seatNumber: student.seatNumber,
      fatherName: student.fatherName,
    });
  };

  const closeActionModal = () => {
    setSelectedStudent(null);
    setActionTab("menu");
    setSubmitting(false);
  };

  // Submit student details edit
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classData || !selectedStudent) return;
    setSubmitting(true);

    try {
      const response = await fetch("/api/students", {
        method: "PATCH",
        headers: await authHeaders(true),
        body: JSON.stringify({
          classId: classData.id,
          action: "edit_details",
          studentUid: selectedStudent.uid,
          fullName: editForm.fullName,
          seatNumber: editForm.seatNumber,
          fatherName: editForm.fatherName,
        }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Failed to update student."));

      toast("Student details updated successfully.", "success");
      closeActionModal();
      await loadData();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Update failed.", "error");
      setSubmitting(false);
    }
  }

  // Assign or revoke secondary CR
  async function handleCrRoleChange(action: "assign_secondary_cr" | "revoke_secondary_cr") {
    if (!classData || !selectedStudent) return;
    setSubmitting(true);

    try {
      const response = await fetch("/api/students", {
        method: "PATCH",
        headers: await authHeaders(true),
        body: JSON.stringify({
          classId: classData.id,
          action,
          studentUid: selectedStudent.uid,
        }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Role modification failed."));

      toast(
        action === "assign_secondary_cr"
          ? `${selectedStudent.fullName} appointed as Secondary CR.`
          : `Secondary CR role revoked.`,
        "success"
      );
      closeActionModal();
      await loadData();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Role modification failed.", "error");
      setSubmitting(false);
    }
  }

  // Remove student permanently
  async function handleRemoveStudent() {
    if (!classData || !selectedStudent) return;
    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/students?classId=${encodeURIComponent(classData.id)}&studentUid=${encodeURIComponent(selectedStudent.uid)}`,
        {
          method: "DELETE",
          headers: await authHeaders(),
        }
      );
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Failed to remove student."));

      toast(
        `${selectedStudent.fullName} completely removed from database, attendance records, and Google Sheets.`,
        "success"
      );
      closeActionModal();
      await loadData();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Removal failed.", "error");
      setSubmitting(false);
    }
  }

  // CR enrolls themselves as a student
  async function handleSelfEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!classData) return;
    setSubmitting(true);

    try {
      const response = await fetch("/api/students", {
        method: "PATCH",
        headers: await authHeaders(true),
        body: JSON.stringify({
          classId: classData.id,
          action: "enroll_cr",
          seatNumber: selfEnrollForm.seatNumber,
          fatherName: selfEnrollForm.fatherName,
          fullName: selfEnrollForm.fullName,
        }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Enrollment failed."));

      toast("You are now enrolled in the class student roster.", "success");
      setShowSelfEnrollModal(false);
      setSubmitting(false);
      await loadData();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Enrollment failed.", "error");
      setSubmitting(false);
    }
  }

  const secondaryCrStudent = students.find((s) => s.isSecondaryCr);
  const primaryCrStudent = students.find((s) => s.isPrimaryCr);

  if (loading) {
    return <StudentsSkeleton />;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </Link>
        <span className="text-[var(--text-muted)] text-xs">/</span>
        <span className="text-xs font-semibold text-[var(--accent)]">Students</span>
      </div>

      {/* Header Section */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Class Directory & Roster</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Students Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
            {classData
              ? `${classData.className ?? ""} · Section ${classData.section ?? ""} · ${classData.department ?? ""}`
              : "View, edit, assign roles, and manage class student enrollment."}
          </p>
        </div>

        {/* Self-Enroll Button for CR if not yet enrolled */}
        {isCr && !crSelfEnrolled && (
          <button
            type="button"
            onClick={() => {
              setSelfEnrollForm({
                fullName: firebaseAuth.currentUser?.displayName ?? "",
                seatNumber: "",
                fatherName: "",
              });
              setShowSelfEnrollModal(true);
            }}
            className="button-primary text-xs py-2.5 px-4 whitespace-nowrap inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Myself as Student</span>
          </button>
        )}
      </div>

      {/* CR Self-Enrollment Notice Card */}
      {isCr && !crSelfEnrolled && !loading && (
        <div className="mt-6 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)]/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[var(--primary)] text-[#07110D] font-black text-sm">
              CR
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                You haven&apos;t added yourself to this class student roster yet
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                As the Class Representative, you are also an enrolled student. Add yourself so you appear on attendance registers and Google Sheets.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelfEnrollForm({
                fullName: firebaseAuth.currentUser?.displayName ?? "",
                seatNumber: "",
                fatherName: "",
              });
              setShowSelfEnrollModal(true);
            }}
            className="button-primary text-xs py-2 px-4 whitespace-nowrap self-start sm:self-auto"
          >
            Add Myself as Student
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="card p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <div className="skeleton h-3.5 w-24 rounded" />
                  <div className="skeleton mt-1.5 h-7 w-20 rounded-lg" />
                </div>
                <div className="skeleton h-10 w-10 rounded-xl flex-none" />
              </div>
              <div className="mt-3 pt-2.5 border-t border-[var(--border)]">
                <div className="skeleton h-3 w-36 rounded" />
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="card p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)]">Total Enrolled</p>
                  <p className="mt-1 text-2xl font-extrabold text-white">{students.length}</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--accent)]">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[var(--text-muted)] border-t border-[var(--border)] pt-2.5">
                Active students on class roster
              </p>
            </div>

            <div className="card p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)]">Secondary CR</p>
                  <p className="mt-1 text-sm font-bold text-white truncate max-w-[170px]">
                    {secondaryCrStudent ? secondaryCrStudent.fullName : "None assigned"}
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <UserCheck className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[var(--text-muted)] border-t border-[var(--border)] pt-2.5">
                {secondaryCrStudent
                  ? `Seat #${secondaryCrStudent.seatNumber} (Roll-call enabled)`
                  : "Assign a student as 2nd CR"}
              </p>
            </div>

            <div className="card p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)]">Class Representative</p>
                  <p className="mt-1 text-sm font-bold text-white truncate max-w-[170px]">
                    {primaryCrStudent ? primaryCrStudent.fullName : "Workspace Owner"}
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] border border-[var(--border-hover)] text-[var(--accent)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[var(--text-muted)] border-t border-[var(--border)] pt-2.5">
                {primaryCrStudent
                  ? `Seat #${primaryCrStudent.seatNumber} · Full manager`
                  : crSelfEnrolled
                  ? "Enrolled in roster"
                  : "Not yet in student roster"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Filters, Search & Sort Bar */}
      <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field pl-9.5 pr-8 py-2 text-xs"
            placeholder="Search by seat #, name, father name, or email..."
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills & Sort Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter Pills */}
          <div className="flex max-w-full items-center overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 text-xs">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                roleFilter === "all"
                  ? "bg-[var(--primary)] text-[#07110D] font-semibold shadow"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              All ({students.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("secondary_cr")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                roleFilter === "secondary_cr"
                  ? "bg-blue-500 text-white font-semibold shadow"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              2nd CR
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("cr")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                roleFilter === "cr"
                  ? "bg-[var(--accent)] text-[#07110D] font-semibold shadow"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              CR
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("student")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                roleFilter === "student"
                  ? "bg-[var(--surface-elevated)] text-white font-semibold shadow"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              Students
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="w-full sm:w-52">
            <CustomSelect
              value={sortBy}
              options={[
                { value: "seat_asc", label: "Seat # (Lowest First)" },
                { value: "seat_desc", label: "Seat # (Highest First)" },
                { value: "name_asc", label: "Name (A-Z)" },
                { value: "name_desc", label: "Name (Z-A)" },
              ]}
              placeholder="Sort order"
              onChange={(val) => setSortBy(val as SortOption)}
            />
          </div>
        </div>
      </div>

      {/* Main Student Roster Table */}
      <section className="mt-6 card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-secondary)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <tr>
                <th className="w-28 px-5 py-3.5">Seat #</th>
                <th className="px-5 py-3.5">Student Name</th>
                <th className="px-5 py-3.5">Father Name</th>
                <th className="px-5 py-3.5">Email Address</th>
                <th className="px-5 py-3.5 text-center">Role / Status</th>
                <th className="w-20 px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                Array.from({ length: 6 }, (_, index) => (
                  <tr key={index}>
                    <td className="px-5 py-3.5">
                      <div className="skeleton h-4 w-16 rounded" />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="skeleton h-8 w-8 rounded-full flex-none" />
                        <div className="skeleton h-4 w-32 rounded" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="skeleton h-4 w-28 rounded" />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="skeleton h-4 w-40 rounded" />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="skeleton mx-auto h-5 w-20 rounded-full" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="skeleton ml-auto h-7 w-7 rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : filteredStudents.length ? (
                filteredStudents.map((student) => {
                  const initials = student.fullName ? student.fullName.charAt(0).toUpperCase() : "S";

                  return (
                    <tr
                      key={student.uid}
                      onClick={() => openActionModal(student)}
                      className="cursor-pointer transition-colors hover:bg-[var(--surface-hover)] group"
                    >
                      {/* Seat Number */}
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-white whitespace-nowrap">
                        <span className="rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] px-2 py-1">
                          {student.seatNumber || "-"}
                        </span>
                      </td>

                      {/* Name with Avatar */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-bold text-[var(--accent)]">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-white group-hover:text-[var(--accent)] transition-colors">
                              {student.fullName}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Father Name */}
                      <td className="px-5 py-3.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                        {student.fatherName || "-"}
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3.5 text-xs font-mono text-[var(--text-muted)] whitespace-nowrap">
                        {student.email}
                      </td>

                      {/* Badges / Roles */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {student.isPrimaryCr ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--accent)]">
                            <ShieldCheck className="h-3 w-3" />
                            <span>Class Rep</span>
                          </span>
                        ) : student.isSecondaryCr ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold text-blue-300">
                            <UserCheck className="h-3 w-3" />
                            <span>2nd CR</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                            <span>Student</span>
                          </span>
                        )}
                      </td>

                      {/* Action Trigger */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openActionModal(student);
                          }}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)] hover:text-white"
                          title="Student actions"
                          aria-label={`Actions for ${student.fullName}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-xs text-[var(--text-muted)]">
                    No students match your search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-secondary)]/60 px-5 py-3 text-xs text-[var(--text-secondary)]">
          <div>
            Showing <strong className="text-white font-semibold">{filteredStudents.length}</strong> of{" "}
            <strong className="text-white font-semibold">{students.length}</strong> enrolled students
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Click any row to edit details, assign 2nd CR, or remove student.
          </div>
        </div>
      </section>

      {/* Action Modal for Selected Student */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-md my-auto rounded-2xl border border-[var(--border-hover)] bg-[var(--surface)] p-4 sm:p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
            {/* Close Button */}
            <button
              type="button"
              onClick={closeActionModal}
              className="absolute right-3.5 top-3.5 z-10 grid h-8 w-8 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Student Header Monogram & Name */}
            <div className="flex items-center gap-3 pr-8 pb-4 border-b border-[var(--border)] flex-none">
              <div className="grid h-10 w-10 sm:h-11 sm:w-11 flex-none place-items-center rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm font-bold text-[var(--accent)]">
                {selectedStudent.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-[160px] sm:max-w-[200px]">
                    {selectedStudent.fullName}
                  </h3>
                  {selectedStudent.isPrimaryCr ? (
                    <span className="badge-present text-[10px] py-0 px-2">CR</span>
                  ) : selectedStudent.isSecondaryCr ? (
                    <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold">
                      2nd CR
                    </span>
                  ) : (
                    <span className="badge-neutral text-[10px] py-0 px-2">Student</span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-mono truncate mt-0.5">
                  Seat #{selectedStudent.seatNumber || "—"} · <span className="text-[var(--text-muted)]">{selectedStudent.email}</span>
                </p>
              </div>
            </div>

            {/* Modal Body: Option Menu View */}
            {actionTab === "menu" && (
              <div className="overflow-y-auto flex-1 mt-4 space-y-2.5 pr-0.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Available Student Actions
                </p>

                {/* Edit Details Option */}
                <button
                  type="button"
                  onClick={() => setActionTab("edit")}
                  className="w-full flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-left transition hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)] group"
                >
                  <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-[var(--surface-elevated)] text-[var(--accent)] border border-[var(--border)] mt-0.5">
                    <Edit3 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white group-hover:text-[var(--accent)] transition-colors leading-tight">
                      Edit Student Details
                    </p>
                    <p className="text-xs text-[var(--text-muted)] break-words leading-snug mt-1">
                      Modify name, seat number, or father name (email is protected).
                    </p>
                  </div>
                </button>

                {/* Assign / Revoke 2nd CR Option */}
                {!selectedStudent.isPrimaryCr && (
                  selectedStudent.isSecondaryCr ? (
                    <button
                      type="button"
                      onClick={() => setActionTab("revoke_cr")}
                      className="w-full flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left transition hover:bg-amber-500/20 group"
                    >
                      <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-amber-500/20 text-amber-300 mt-0.5">
                        <UserMinus className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-amber-200 leading-tight">
                          Revoke 2nd CR Role
                        </p>
                        <p className="text-xs text-amber-300/80 break-words leading-snug mt-1">
                          Demote to normal student (removes roll-call attendance marking rights).
                        </p>
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActionTab("assign_cr")}
                      className="w-full flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-left transition hover:bg-blue-500/20 group"
                    >
                      <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-blue-500/20 text-blue-300 mt-0.5">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-blue-200 leading-tight">
                          Appoint as Secondary CR
                        </p>
                        <p className="text-xs text-blue-300/80 break-words leading-snug mt-1">
                          Allows this student to take roll-call attendance for all subjects (no sheets access).
                        </p>
                      </div>
                    </button>
                  )
                )}

                {/* Remove Student Option */}
                {!selectedStudent.isPrimaryCr ? (
                  <button
                    type="button"
                    onClick={() => setActionTab("remove")}
                    className="w-full flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left transition hover:bg-red-500/20 group"
                  >
                    <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-red-500/20 text-red-400 mt-0.5">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-red-200 leading-tight">
                        Remove Student Completely
                      </p>
                      <p className="text-xs text-red-300/80 break-words leading-snug mt-1">
                        Deletes membership, attendance history, and row from Google Sheets.
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs text-[var(--text-muted)] flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[var(--accent)] flex-none" />
                    <span>This account is the primary Class Representative and workspace owner.</span>
                  </div>
                )}
              </div>
            )}

            {/* Modal Body: Edit Form View */}
            {actionTab === "edit" && (
              <form onSubmit={handleEditSubmit} className="overflow-y-auto flex-1 mt-4 space-y-4 pr-0.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Edit Student Details</h4>
                  <button
                    type="button"
                    onClick={() => setActionTab("menu")}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    ← Back to options
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Seat Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    value={editForm.seatNumber}
                    onChange={(e) => setEditForm((c) => ({ ...c, seatNumber: e.target.value }))}
                    className="field mt-1.5 font-mono"
                    placeholder="e.g. BSCS-2024-042"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Student Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm((c) => ({ ...c, fullName: e.target.value }))}
                    className="field mt-1.5"
                    placeholder="e.g. Hammad Ahmed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Father Name
                  </label>
                  <input
                    value={editForm.fatherName}
                    onChange={(e) => setEditForm((c) => ({ ...c, fatherName: e.target.value }))}
                    className="field mt-1.5"
                    placeholder="e.g. Muhammad ..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Email Address (Read-only)
                  </label>
                  <input
                    disabled
                    value={selectedStudent.email}
                    className="field mt-1.5 opacity-60 cursor-not-allowed bg-black/40 font-mono text-xs"
                  />
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    Student account emails cannot be modified.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActionTab("menu")}
                    className="button-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="button-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Modal Body: Assign 2nd CR Confirmation */}
            {actionTab === "assign_cr" && (
              <div className="overflow-y-auto flex-1 mt-4 space-y-4 pr-0.5">
                <div className="flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-200">
                  <UserCheck className="h-5 w-5 text-blue-400 flex-none mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-sm">Appoint as Secondary CR?</p>
                    <p className="mt-1 leading-relaxed">
                      <strong>{selectedStudent.fullName}</strong> will be granted permission to take daily roll-call attendance for all class subjects.
                    </p>
                    <p className="mt-2 text-[11px] text-blue-300">
                      • Can mark attendance for all active subjects.
                      <br />
                      • Cannot open, view, or modify Google Sheets.
                      <br />
                      • Cannot create, edit, or delete classes and subjects.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActionTab("menu")}
                    className="button-secondary text-xs"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleCrRoleChange("assign_secondary_cr")}
                    className="button-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Appointing...</span>
                      </>
                    ) : (
                      <span>Confirm Appoint as 2nd CR</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body: Revoke 2nd CR Confirmation */}
            {actionTab === "revoke_cr" && (
              <div className="overflow-y-auto flex-1 mt-4 space-y-4 pr-0.5">
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                  <AlertCircle className="h-5 w-5 text-amber-400 flex-none mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-sm">Revoke Secondary CR Role?</p>
                    <p className="mt-1 leading-relaxed">
                      This will remove roll-call attendance permissions from <strong>{selectedStudent.fullName}</strong>. They will return to standard student status with personal record access only.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActionTab("menu")}
                    className="button-secondary text-xs"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleCrRoleChange("revoke_secondary_cr")}
                    className="button-danger text-xs py-2 px-4 inline-flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Revoking...</span>
                      </>
                    ) : (
                      <span>Confirm Revoke Role</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body: Remove Student Confirmation */}
            {actionTab === "remove" && (
              <div className="overflow-y-auto flex-1 mt-4 space-y-4 pr-0.5">
                <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200">
                  <Trash2 className="h-5 w-5 text-red-400 flex-none mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-sm">Permanently Remove Student?</p>
                    <p className="mt-1 leading-relaxed">
                      Are you sure you want to remove <strong>{selectedStudent.fullName}</strong> (Seat #{selectedStudent.seatNumber})?
                    </p>
                    <p className="mt-2 text-[11px] text-red-300 leading-normal">
                      ⚠️ This will completely delete:
                      <br />
                      • Class enrollment membership
                      <br />
                      • All historical attendance records for this student
                      <br />
                      • The student&apos;s row from Google Sheets across all subjects
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActionTab("menu")}
                    className="button-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleRemoveStudent()}
                    className="button-danger text-xs py-2 px-4 inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Deleting student...</span>
                      </>
                    ) : (
                      <span>Remove Student Completely</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CR Self-Enrollment Dialog Modal */}
      {showSelfEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-md my-auto rounded-2xl border border-[var(--border-hover)] bg-[var(--surface)] p-4 sm:p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSelfEnrollModal(false)}
              className="absolute right-3.5 top-3.5 z-10 grid h-8 w-8 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 pr-8 pb-4 border-b border-[var(--border)] flex-none">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border)]">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Enroll as Student</h3>
                <p className="text-xs text-[var(--text-secondary)]">Add your account to the attendance register</p>
              </div>
            </div>

            <form onSubmit={handleSelfEnroll} className="overflow-y-auto flex-1 mt-4 space-y-4 pr-0.5">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  My Seat Number <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  value={selfEnrollForm.seatNumber}
                  onChange={(e) => setSelfEnrollForm((c) => ({ ...c, seatNumber: e.target.value }))}
                  className="field mt-1.5 font-mono"
                  placeholder="e.g. BSCS-2024-001"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Full Name
                </label>
                <input
                  value={selfEnrollForm.fullName}
                  onChange={(e) => setSelfEnrollForm((c) => ({ ...c, fullName: e.target.value }))}
                  className="field mt-1.5"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Father Name
                </label>
                <input
                  value={selfEnrollForm.fatherName}
                  onChange={(e) => setSelfEnrollForm((c) => ({ ...c, fatherName: e.target.value }))}
                  className="field mt-1.5"
                  placeholder="e.g. Muhammad ..."
                />
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSelfEnrollModal(false)}
                  className="button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="button-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Enrolling...</span>
                    </>
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

function StudentsSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <div className="skeleton h-3.5 w-16 rounded" />
        <span className="text-[var(--text-muted)] text-xs">/</span>
        <div className="skeleton h-3.5 w-20 rounded" />
      </div>

      {/* Header Section Skeleton */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="skeleton h-3.5 w-3.5 rounded-full" />
            <div className="skeleton h-3.5 w-36 rounded-md" />
          </div>
          <div className="mt-1 skeleton h-8 sm:h-9 w-64 sm:w-80 rounded-xl" />
          <div className="mt-1.5 skeleton h-4 w-72 sm:w-96 rounded-md" />
        </div>
        <div className="skeleton h-9 w-40 rounded-xl" />
      </div>

      {/* KPI Stats Cards Skeleton */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <div className="skeleton h-3.5 w-24 rounded" />
                <div className="skeleton mt-2 h-7 w-20 rounded-lg" />
              </div>
              <div className="skeleton h-10 w-10 rounded-xl flex-none" />
            </div>
            <div className="mt-3 pt-2.5 border-t border-[var(--border)]">
              <div className="skeleton h-3 w-36 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters, Search & Sort Bar Skeleton */}
      <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="skeleton h-9 w-full sm:max-w-md rounded-xl" />
        <div className="flex flex-wrap items-center gap-2">
          <div className="skeleton h-8 w-60 rounded-xl" />
          <div className="skeleton h-9 w-full sm:w-52 rounded-xl" />
        </div>
      </div>

      {/* Main Student Roster Table Skeleton */}
      <section className="mt-6 card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-secondary)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <tr>
                <th className="w-28 px-5 py-3.5">
                  <div className="skeleton h-3.5 w-12 rounded" />
                </th>
                <th className="px-5 py-3.5">
                  <div className="skeleton h-3.5 w-24 rounded" />
                </th>
                <th className="px-5 py-3.5">
                  <div className="skeleton h-3.5 w-20 rounded" />
                </th>
                <th className="px-5 py-3.5">
                  <div className="skeleton h-3.5 w-24 rounded" />
                </th>
                <th className="px-5 py-3.5 text-center">
                  <div className="skeleton mx-auto h-3.5 w-20 rounded" />
                </th>
                <th className="w-20 px-5 py-3.5 text-right">
                  <div className="skeleton ml-auto h-3.5 w-14 rounded" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {Array.from({ length: 6 }, (_, index) => (
                <tr key={index}>
                  <td className="px-5 py-3.5">
                    <div className="skeleton h-4 w-16 rounded" />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="skeleton h-8 w-8 rounded-full flex-none" />
                      <div className="skeleton h-4 w-32 rounded" />
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="skeleton h-4 w-28 rounded" />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="skeleton h-4 w-40 rounded" />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="skeleton mx-auto h-5 w-20 rounded-full" />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="skeleton ml-auto h-7 w-7 rounded-lg" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
