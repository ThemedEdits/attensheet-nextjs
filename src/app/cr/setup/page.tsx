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
import { ArrowLeft, Sparkles, Building2, BookOpen, Layers, Calendar, GraduationCap, Hash, AlertCircle, Loader2, ArrowRight } from "lucide-react";

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

