"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import { useToast } from "@/components/ToastProvider";
import { updatePendingCount } from "@/lib/session-cache";
import { ActionModal } from "@/components/ActionModal";
import { 
  ArrowLeft, 
  UserCheck, 
  GraduationCap, 
  User, 
  Check, 
  X, 
  CheckCheck,
  AlertCircle, 
  Sparkles,
  Loader2 
} from "lucide-react";

type RequestItem = { id: string; fullName?: string; teacherUid?: string; studentUid?: string; seatNumber?: string };

export default function RequestsPage() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState<"approve_all" | "reject_all" | null>(null);
  const toast = useToast();

  async function handleBulkAction(action: "approve_all" | "reject_all") {
    setBulkBusy(true);
    try {
      const response = await fetch("/api/requests", {
        method: "PATCH",
        headers: await authHeaders(true),
        body: JSON.stringify({ action }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Failed to process bulk requests."));
      await load();
      updatePendingCount(0);
      toast(String(result.message ?? "Requests processed successfully."), "success");
      setConfirmBulk(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to process bulk requests.", "error");
    } finally {
      setBulkBusy(false);
    }
  }

  async function load() {
    try {
      const response = await fetch("/api/requests", { headers: await authHeaders() });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Unable to load requests."));
      const reqList = Array.isArray(result.requests) ? (result.requests as RequestItem[]) : [];
      setItems(reqList);
      updatePendingCount(reqList.length);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function decide(item: RequestItem, decision: "approved" | "rejected") {
    setBusyId(item.id);
    try {
      const response = await fetch("/api/requests", {
        method: "PATCH",
        headers: await authHeaders(true),
        body: JSON.stringify({
          requestId: item.id,
          kind: item.teacherUid ? "teacherRequests" : "studentRequests",
          decision,
        }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Unable to update request."));
      await load();
      toast(`Request ${decision}.`, "success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update request.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <RequestsSkeleton />;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Dashboard</span>
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Class Representative Administration</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Join Requests
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
            Review and approve pending access requests from enrolled students and teachers.
          </p>
        </div>

        {/* Action Controls & Counter Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          {items.length > 0 && (
            <div className="flex items-center gap-2 mr-1">
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => setConfirmBulk("approve_all")}
                className="button-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
                title="Approve all pending requests"
              >
                {bulkBusy && confirmBulk === "approve_all" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
                <span>Approve all</span>
              </button>

              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => setConfirmBulk("reject_all")}
                className="button-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 hover:border-red-500/30"
                title="Reject all pending requests"
              >
                {bulkBusy && confirmBulk === "reject_all" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                <span>Reject all</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {confirmBulk && (
        <ActionModal
          title={confirmBulk === "approve_all" ? "Approve All Requests?" : "Reject All Requests?"}
          description={
            confirmBulk === "approve_all"
              ? `Are you sure you want to approve all ${items.length} pending request(s)? Any approved students will be enrolled into the class roster and synchronized with Google Sheets.`
              : `Are you sure you want to reject all ${items.length} pending request(s)? This will decline access for all students and teachers currently awaiting approval.`
          }
          confirmLabel={confirmBulk === "approve_all" ? "Approve All" : "Reject All"}
          danger={confirmBulk === "reject_all"}
          disabled={bulkBusy}
          onConfirm={() => void handleBulkAction(confirmBulk)}
          onClose={() => {
            if (!bulkBusy) setConfirmBulk(null);
          }}
        />
      )}

      {message && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs sm:text-sm text-red-200">
          <AlertCircle className="h-4 w-4 flex-none text-red-400 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {/* Requests List */}
      <div className="mt-8 space-y-3">
        {items.length ? (
          items.map((item) => {
            const isTeacher = Boolean(item.teacherUid);
            const isProcessing = busyId === item.id;

            return (
              <div
                key={item.id}
                className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl border ${
                    isTeacher 
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-400" 
                      : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]"
                  }`}>
                    {isTeacher ? <GraduationCap className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">
                        {item.fullName ?? (isTeacher ? item.teacherUid : "Student")}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        isTeacher ? "bg-blue-500/20 text-blue-300" : "bg-[var(--accent-soft)] text-[var(--accent)]"
                      }`}>
                        {isTeacher ? "Teacher" : "Student"}
                      </span>
                    </div>

                    {!isTeacher && item.seatNumber && (
                      <p className="mt-1 text-xs text-[var(--text-muted)] font-mono">
                        Seat #{item.seatNumber}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => void decide(item, "approved")}
                    className="button-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    )}
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => void decide(item, "rejected")}
                    className="button-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card p-12 text-center">
            <UserCheck className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
            <h2 className="mt-4 text-base font-bold text-white">No pending requests</h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
              All students and teachers who used your class code have been reviewed.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function RequestsSkeleton() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Link Skeleton */}
      <div className="skeleton h-3.5 w-28 rounded-md" />

      {/* Header Skeleton */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="skeleton h-3.5 w-3.5 rounded-full" />
            <div className="skeleton h-3.5 w-48 rounded-md" />
          </div>
          <div className="mt-1 skeleton h-8 sm:h-9 w-44 sm:w-56 rounded-xl" />
          <div className="mt-1.5 skeleton h-4 w-72 sm:w-96 rounded-md" />
        </div>
      </div>

      {/* Requests List Skeleton */}
      <div className="mt-8 space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="skeleton h-10 w-10 rounded-xl flex-none" />
              <div>
                <div className="flex items-center gap-2">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
                <div className="mt-2 skeleton h-3 w-20 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <div className="skeleton h-8 w-20 rounded-xl" />
              <div className="skeleton h-8 w-18 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

