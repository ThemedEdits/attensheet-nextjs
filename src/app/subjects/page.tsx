"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import type { ClassRecord, SubjectRecord } from "@/lib/domain";
import { useToast } from "@/components/ToastProvider";
import { ActionModal } from "@/components/ActionModal";
import { CustomSelect } from "@/components/CustomSelect";
import { firebaseAuth } from "@/lib/firebase";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  FileSpreadsheet,
  Download,
  CalendarDays,
} from "lucide-react";
import { DownloadAttendanceModal } from "@/components/DownloadAttendanceModal";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [classRecord, setClassRecord] = useState<ClassRecord | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [members, setMembers] = useState<{ uid: string; fullName?: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Subject Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newTeacherUid, setNewTeacherUid] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Subject Modal State
  const [editingSubject, setEditingSubject] = useState<SubjectRecord | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editTeacherUid, setEditTeacherUid] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete Subject Confirmation State
  const [confirmDelete, setConfirmDelete] = useState<SubjectRecord | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Download Attendance Modal State
  const [downloadModalSubject, setDownloadModalSubject] = useState<SubjectRecord | null>(null);

  const toast = useToast();

  const [sessions, setSessions] = useState<{ subjectId: string; date: string }[]>([]);

  async function loadData() {
    try {
      const response = await fetch("/api/dashboard", { headers: await authHeaders() });
      const result = await readApiResponse(response);
      if (response.ok) {
        setSubjects((result.subjects ?? []) as SubjectRecord[]);
        setClassRecord(result.class as ClassRecord | null);
        setRole((result.profile as { role?: string } | undefined)?.role ?? null);
        setMembers((result.members ?? []) as { uid: string; fullName?: string; role: string }[]);
        setSessions((result.sessions ?? []) as { subjectId: string; date: string }[]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const teachers = members.filter((member) => member.role === "teacher");
  const teacherOptions = [
    { value: "", label: "No teacher / Awaiting assignment" },
    ...teachers.map((teacher) => ({
      value: teacher.uid,
      label: teacher.fullName ? `Prof. ${teacher.fullName}` : teacher.uid,
    })),
  ];

  async function handleAddSubject() {
    if (!classRecord || !newSubjectName.trim()) return;
    setSubmittingAdd(true);
    try {
      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: await authHeaders(true),
        body: JSON.stringify({ classId: classRecord.id, name: newSubjectName.trim() }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(String(result.error ?? "Unable to create subject."));
      }
      const newId = String(result.id);
      if (newTeacherUid) {
        await fetch("/api/subjects", {
          method: "PATCH",
          headers: await authHeaders(true),
          body: JSON.stringify({
            subjectId: newId,
            teacherUid: newTeacherUid,
          }),
        });
      }
      toast("Subject created and sheet tab generated.", "success");
      setShowAddModal(false);
      setNewSubjectName("");
      setNewTeacherUid("");
      await loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Unable to create subject.", "error");
    } finally {
      setSubmittingAdd(false);
    }
  }

  async function handleUpdateSubject() {
    if (!editingSubject || !editSubjectName.trim()) return;
    setSubmittingEdit(true);
    try {
      const response = await fetch("/api/subjects", {
        method: "PATCH",
        headers: await authHeaders(true),
        body: JSON.stringify({
          subjectId: editingSubject.id,
          name: editSubjectName.trim(),
          teacherUid: editTeacherUid || null,
        }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(String(result.error ?? "Unable to update subject."));
      }
      toast("Subject updated successfully.", "success");
      setEditingSubject(null);
      await loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Unable to update subject.", "error");
    } finally {
      setSubmittingEdit(false);
    }
  }

  async function handleDeleteSubject() {
    if (!confirmDelete) return;
    setSubmittingDelete(true);
    try {
      const response = await fetch(`/api/subjects?subjectId=${encodeURIComponent(confirmDelete.id)}`, {
        method: "DELETE",
        headers: await authHeaders(),
      });
      const result = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(String(result.error ?? "Unable to delete subject."));
      }
      toast("Subject removed completely.", "success");
      setConfirmDelete(null);
      await loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Unable to delete subject.", "error");
    } finally {
      setSubmittingDelete(false);
    }
  }

  const totalSessions = sessions.length;
  const sessionsBySubject = subjects.reduce((acc, subject) => {
    acc[subject.id] = sessions.filter(s => s.subjectId === subject.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return acc;
  }, {} as Record<string, { subjectId: string; date: string }[]>);

  const subjectColors = subjects.reduce((acc, subject, index) => {
    const colors = [
      "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-pink-500", 
      "bg-orange-500", "bg-yellow-500", "bg-teal-500", "bg-cyan-500",
      "bg-indigo-500", "bg-rose-500"
    ];
    acc[subject.id] = colors[index % colors.length];
    return acc;
  }, {} as Record<string, string>);

  if (loading) {
    return <SubjectsSkeleton />;
  }

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
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
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

        {role === "cr" && (
          <button
            type="button"
            onClick={() => {
              setNewSubjectName("");
              setNewTeacherUid("");
              setShowAddModal(true);
            }}
            className="button-primary text-xs py-2.5 px-4 inline-flex items-center gap-2 self-start sm:self-auto whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Add Subject</span>
          </button>
        )}
      </div>

      {/* Session Stats Bar */}
      {(role === "cr" || role === "teacher") && totalSessions > 0 && (
        <div className="mt-8 card p-4 sm:p-6 border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <h2 className="text-sm font-semibold text-white">Total Sessions Held</h2>
            <span className="text-xs font-medium bg-[var(--surface-elevated)] px-2.5 py-1 rounded-full text-white border border-[var(--border)]">
              {totalSessions} {totalSessions === 1 ? "Session" : "Sessions"} Combined
            </span>
          </div>
          
          <div className="h-4 w-full rounded-full overflow-hidden flex bg-[var(--surface-elevated)]">
            {subjects.map(subject => {
              const count = sessionsBySubject[subject.id]?.length || 0;
              if (count === 0) return null;
              const percentage = (count / totalSessions) * 100;
              return (
                <div 
                  key={subject.id} 
                  className={`h-full ${subjectColors[subject.id]} transition-all hover:opacity-80`}
                  style={{ width: `${percentage}%` }}
                  title={`${subject.name}: ${count} sessions (${percentage.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {subjects.map(subject => {
              const count = sessionsBySubject[subject.id]?.length || 0;
              if (count === 0) return null;
              const percentage = (count / totalSessions) * 100;
              return (
                <div key={subject.id} className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[var(--text-secondary)]">
                  <span className={`h-2 w-2 rounded-full ${subjectColors[subject.id]}`} />
                  <span className="truncate max-w-[120px] sm:max-w-[200px]">{subject.name}</span>
                  <span className="font-medium text-white">{percentage.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subjects Grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.length ? (
          subjects.map((subject) => {
            const classId = classRecord?.id ?? subject.classId;
            const isAssignedToCurrentTeacher = subject.teacherUid === firebaseAuth.currentUser?.uid;
            const isStudentUser = role === "student";
            const href = isStudentUser 
              ? `/history?subjectId=${subject.id}` 
              : `/attendance?classId=${classId}&subjectId=${subject.id}`;
            const assignedTeacherName = subject.teacherName ?? members.find((m) => m.uid === subject.teacherUid)?.fullName;
            const teacherDisplay = assignedTeacherName ? `Prof. ${assignedTeacherName}` : "Awaiting teacher assignment";
            const canManage = role === "cr" || isAssignedToCurrentTeacher;

            return (
              <div
                key={subject.id}
                className="card card-hover p-6 flex flex-col justify-between group transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--accent)] group-hover:border-[var(--border-hover)]">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    {isAssignedToCurrentTeacher ? (
                      <span className="badge-present text-[10px]">Your Subject</span>
                    ) : (
                      <span className="rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                        Active
                      </span>
                    )}
                  </div>

                  <Link href={href} className="mt-5 block">
                    <h2 className="text-base font-bold text-white group-hover:text-[var(--accent)] transition-colors">
                      {subject.name}
                    </h2>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <GraduationCap className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      <span>{teacherDisplay}</span>
                    </div>
                  </Link>

                  {(role === "cr" || role === "teacher") && (
                    <div className="mt-4 pt-3 border-t border-[var(--border)]">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-2">
                        <CalendarDays className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        <span className="font-medium text-white">{sessionsBySubject[subject.id]?.length || 0} sessions held</span>
                      </div>
                      {(sessionsBySubject[subject.id]?.length || 0) > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border)]">
                          {(sessionsBySubject[subject.id] || []).map(session => {
                            const [year, month, day] = session.date.split('-');
                            const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
                            return (
                              <span key={session.date} className="px-1.5 py-0.5 rounded bg-[var(--surface)] text-[10px] text-[var(--text-secondary)] border border-[var(--border)]">
                                {dateObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' })}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)]">No sessions recorded yet.</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3.5 border-t border-[var(--border)] flex items-center justify-between">
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:text-[var(--primary-hover)]"
                  >
                    <span>{isStudentUser ? "View My Attendance" : "Take Attendance"}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>

                  {(role === "cr" || role === "teacher") && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDownloadModalSubject(subject)}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-emerald-400 transition-colors"
                        title="Download attendance sheet (Excel, PDF, Google Sheet)"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>

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
                      {canManage && (
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
                      )}
                      {role === "cr" && (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(subject)}
                          className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                          title="Delete subject"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="sm:col-span-2 lg:col-span-3 card p-10 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
            <p className="mt-4 text-sm font-semibold text-white">No active subjects registered</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {role === "cr"
                ? "Click 'Add Subject' above to create course subjects for your class workspace."
                : "Your Class Representative has not created any course subjects yet."}
            </p>
          </div>
        )}
      </div>

      {/* Add Subject Modal */}
      {showAddModal && (
        <ActionModal
          title="Add New Subject"
          description="Create a course subject for roll-calls and Google Sheets synchronization."
          confirmLabel={submittingAdd ? "Creating..." : "Create Subject"}
          onClose={() => setShowAddModal(false)}
          onConfirm={handleAddSubject}
          disabled={submittingAdd || !newSubjectName.trim()}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Subject Name *
              </label>
              <input
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="field"
                placeholder="e.g. Software Quality Assurance"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Assign Teacher (Optional)
              </label>
              <CustomSelect
                value={newTeacherUid}
                onChange={setNewTeacherUid}
                options={teacherOptions}
                placeholder="Select a teacher (if available)"
              />
            </div>
          </div>
        </ActionModal>
      )}

      {/* Edit Subject Modal */}
      {editingSubject && (
        <ActionModal
          title="Edit Subject"
          description="Update course name and reassign the course instructor."
          confirmLabel={submittingEdit ? "Saving..." : "Save Changes"}
          onClose={() => setEditingSubject(null)}
          onConfirm={handleUpdateSubject}
          disabled={submittingEdit || !editSubjectName.trim()}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Subject Name *
              </label>
              <input
                value={editSubjectName}
                onChange={(e) => setEditSubjectName(e.target.value)}
                className="field"
                placeholder="e.g. Operating Systems"
              />
            </div>
            {role === "cr" && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Assigned Teacher
                </label>
                <CustomSelect
                  value={editTeacherUid}
                  onChange={setEditTeacherUid}
                  options={teacherOptions}
                  placeholder="Select a teacher"
                />
              </div>
            )}
          </div>
        </ActionModal>
      )}

      {/* Delete Subject Confirmation Modal */}
      {confirmDelete && (
        <ActionModal
          title="Delete Subject"
          description={`Are you sure you want to delete "${confirmDelete.name}"? All related attendance logs for this subject will be permanently removed.`}
          confirmLabel={submittingDelete ? "Deleting..." : "Delete Subject"}
          danger
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDeleteSubject}
          disabled={submittingDelete}
        />
      )}

      {/* Download Attendance Modal */}
      {downloadModalSubject && classRecord && (
        <DownloadAttendanceModal
          isOpen={Boolean(downloadModalSubject)}
          onClose={() => setDownloadModalSubject(null)}
          subject={downloadModalSubject}
          classRecord={classRecord}
        />
      )}
    </main>
  );
}

function SubjectsSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Link Skeleton */}
      <div className="skeleton h-3.5 w-28 rounded-md" />

      {/* Page Header Skeleton */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="skeleton h-3.5 w-3.5 rounded-full" />
            <div className="skeleton h-3.5 w-36 rounded-md" />
          </div>
          <div className="mt-1 skeleton h-8 sm:h-9 w-48 sm:w-60 rounded-xl" />
          <div className="mt-1.5 skeleton h-4 w-72 sm:w-96 rounded-md" />
        </div>
        <div className="skeleton h-9 w-32 rounded-xl" />
      </div>

      {/* Session Stats Bar Skeleton */}
      <div className="mt-8 card p-4 sm:p-6 border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <div className="skeleton h-5 w-32 rounded-md" />
          <div className="skeleton h-6 w-24 rounded-full" />
        </div>
        <div className="skeleton h-4 w-full rounded-full" />
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="skeleton h-2 w-2 rounded-full" />
              <div className="skeleton h-3 w-16 rounded-md" />
              <div className="skeleton h-3 w-6 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Subjects Grid Skeleton */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="skeleton h-11 w-11 rounded-xl" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="mt-5 space-y-2">
                <div className="skeleton h-5 w-40 rounded-md" />
                <div className="skeleton h-3.5 w-32 rounded-md" />
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-2">
                <div className="skeleton h-3.5 w-24 rounded-md" />
                <div className="flex gap-1.5 flex-wrap">
                  <div className="skeleton h-4 w-12 rounded" />
                  <div className="skeleton h-4 w-12 rounded" />
                  <div className="skeleton h-4 w-12 rounded" />
                </div>
              </div>
            </div>
            <div className="mt-6 pt-3.5 border-t border-[var(--border)] flex items-center justify-between">
              <div className="skeleton h-4 w-28 rounded-md" />
              <div className="flex items-center gap-1.5">
                <div className="skeleton h-7 w-7 rounded-lg" />
                <div className="skeleton h-7 w-7 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

