"use client";

import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { firebaseAuth, firestore } from "@/lib/firebase";
import { classSchema } from "@/lib/validation";
import { generateClassCode } from "@/lib/class-code";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import { useToast } from "@/components/ToastProvider";
import { ArrowLeft, Sparkles, Building2, BookOpen, Layers, Calendar, GraduationCap, Hash, AlertCircle, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";

function ClassSetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editing = searchParams.has("edit");
  const [form, setForm] = useState({
    university: "FUUAST",
    semester: "3rd Semester",
    department: "Computer Science",
    batch: "2024",
    className: "BSCS-6",
    section: "D",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [classId, setClassId] = useState("");
  const [addSelfAsStudent, setAddSelfAsStudent] = useState(true);
  const [selfSeatNumber, setSelfSeatNumber] = useState("");
  const [selfFatherName, setSelfFatherName] = useState("");
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (editing) {
      void (async () => {
        try {
          const response = await fetch("/api/dashboard", { headers: await authHeaders() });
          const result = await readApiResponse(response);
          const classData = result.class as Record<string, string> | undefined;
          if (response.ok && classData) {
            setClassId(String(classData.id));
            setIsAlreadyEnrolled(Boolean(result.isCrEnrolledAsStudent));
            setForm({
              university: classData.university,
              semester: classData.semester,
              department: classData.department,
              batch: classData.batch,
              className: classData.className,
              section: classData.section,
            });
          }
        } catch {
          // ignore or handled by dashboard
        }
      })();
    }
  }, [editing]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const parsed = classSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please verify the form inputs.");
      return;
    }
    if (addSelfAsStudent && !isAlreadyEnrolled && !selfSeatNumber.trim()) {
      setError("Please provide your seat number to be enrolled into the student roster.");
      return;
    }
    setBusy(true);

    try {
      if (editing) {
        const response = await fetch("/api/class", {
          method: "PATCH",
          headers: await authHeaders(true),
          body: JSON.stringify({ classId, ...form }),
        });
        const result = await readApiResponse(response);
        if (!response.ok) {
          setError(String(result.error ?? "Unable to update class."));
          setBusy(false);
          return;
        }

        if (addSelfAsStudent && !isAlreadyEnrolled && selfSeatNumber.trim()) {
          await fetch("/api/students", {
            method: "PATCH",
            headers: await authHeaders(true),
            body: JSON.stringify({
              classId,
              action: "enroll_cr",
              seatNumber: selfSeatNumber.trim(),
              fatherName: selfFatherName.trim(),
            }),
          });
        }

        toast("Class details updated.", "success");
        router.replace("/dashboard");
        return;
      }

      const user = firebaseAuth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }
      const existing = await getDocs(
        query(collection(firestore, "classes"), where("crUid", "==", user.uid))
      );
      if (!existing.empty) {
        setError("You already have an active class workspace.");
        setBusy(false);
        return;
      }
      const id = doc(collection(firestore, "classes")).id;
      await setDoc(doc(firestore, "classes", id), {
        ...form,
        crUid: user.uid,
        classCode: generateClassCode(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (addSelfAsStudent && selfSeatNumber.trim()) {
        await setDoc(doc(firestore, "memberships", `${id}_${user.uid}`), {
          classId: id,
          uid: user.uid,
          role: "student",
          status: "approved",
          isPrimaryCr: true,
          isSecondaryCr: false,
          fullName: user.displayName || "Class Representative",
          seatNumber: selfSeatNumber.trim(),
          fatherName: selfFatherName.trim(),
          email: user.email || "",
          approvedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      toast("Class workspace created successfully!", "success");
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setBusy(false);
    }
  }

  const fieldIcons: Record<string, typeof Building2> = {
    university: Building2,
    department: BookOpen,
    className: GraduationCap,
    semester: Layers,
    batch: Calendar,
    section: Hash,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Dashboard</span>
      </Link>

      <div className="mt-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Class Representative Workspace</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {editing ? "Edit Class Workspace" : "Create Class Workspace"}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
          {editing
            ? "Modify your university class specifications. Changes update student rosters."
            : "Set up your university class details. A unique access code will be generated."}
        </p>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs sm:text-sm text-red-200">
          <AlertCircle className="h-4 w-4 flex-none text-red-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="mt-8 card p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {Object.entries(form).map(([key, value]) => {
            const Icon = fieldIcons[key] ?? Building2;
            const formattedLabel = key.replace(/([A-Z])/g, " $1");
            return (
              <div key={key} className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
                  <Icon className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span>{formattedLabel}</span>
                </label>
                <input
                  required
                  value={value}
                  onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
                  className="field"
                />
              </div>
            );
          })}
        </div>

        {/* Student Self-Enrollment Section */}
        {!isAlreadyEnrolled ? (
          <div className="mt-8 rounded-2xl border border-[var(--border-hover)] bg-[var(--bg-secondary)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-sm font-bold text-white">
                    Class Representative Student Enrolment
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                  As the CR, you are also an active student of this class. Automatically add yourself to the student roster so teachers can mark your attendance and Google Sheets includes you.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer flex-none mt-1">
                <input
                  type="checkbox"
                  checked={addSelfAsStudent}
                  onChange={(e) => setAddSelfAsStudent(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[var(--surface-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary)]" />
              </label>
            </div>

            {addSelfAsStudent && (
              <div className="mt-4 pt-4 border-t border-[var(--border)] grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    My Seat Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    required={addSelfAsStudent}
                    value={selfSeatNumber}
                    onChange={(e) => setSelfSeatNumber(e.target.value)}
                    className="field font-mono text-xs"
                    placeholder="e.g. BSCS-2024-001"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Father Name
                  </label>
                  <input
                    value={selfFatherName}
                    onChange={(e) => setSelfFatherName(e.target.value)}
                    className="field text-xs"
                    placeholder="e.g. Muhammad ..."
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-[var(--accent-soft)] bg-[var(--accent-soft)]/30 p-3.5 flex items-center gap-2.5 text-xs text-[var(--accent)] font-medium">
            <CheckCircle2 className="h-4 w-4 flex-none text-[var(--accent)]" />
            <span>You are enrolled as a student in this class roster.</span>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          <Link href="/dashboard" className="button-secondary w-full sm:w-auto text-xs">
            Cancel
          </Link>
          <button
            disabled={busy}
            className="button-primary w-full sm:w-auto text-xs py-2.5 px-5"
          >
            {busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{editing ? "Saving changes..." : "Creating workspace..."}</span>
              </>
            ) : (
              <>
                <span>{editing ? "Save changes" : "Create class"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function ClassSetupPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
            <span>Loading class settings...</span>
          </div>
        </main>
      }
    >
      <ClassSetupForm />
    </Suspense>
  );
}

