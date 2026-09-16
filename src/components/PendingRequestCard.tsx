"use client";

import Link from "next/link";
import { 
  Building2, 
  BookOpen, 
  GraduationCap, 
  Clock, 
  ShieldCheck, 
  User, 
  ArrowRight, 
  RotateCw,
  Sparkles
} from "lucide-react";

export type PendingClassRequest = {
  id: string;
  classId: string;
  className: string;
  department?: string;
  university?: string;
  section?: string;
  semester?: string;
  classCode?: string;
  crName?: string;
  seatNumber?: string;
  fullName?: string;
  fatherName?: string;
  status: string;
  createdAt?: string | null;
};

export function PendingRequestCard({
  request,
  onRefresh,
  refreshing = false,
}: {
  request: PendingClassRequest;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const subtitle = [
    request.university,
    request.department,
    request.section ? `Section ${request.section}` : null,
    request.semester,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="card p-6 sm:p-8 relative overflow-hidden border-[var(--border-hover)]">
      {/* Decorative top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <span>Request Submitted · Awaiting Approval</span>
          </div>
          <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl">
            {request.className}
          </h2>
          {subtitle && (
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
              {subtitle}
            </p>
          )}
        </div>

        {request.classCode && (
          <div className="flex-none">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 py-2 text-center">
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Class Code
              </p>
              <p className="mt-0.5 font-mono text-sm font-bold text-[var(--accent)] tracking-widest">
                {request.classCode}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Details Box */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]/60 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-muted)]">Class Representative</p>
            <p className="text-xs font-semibold text-white">
              {request.crName || "Class Representative"}
            </p>
          </div>
        </div>

        {request.seatNumber ? (
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)]">Enrolled Seat #</p>
              <p className="text-xs font-semibold font-mono text-white">
                {request.seatNumber}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)]">Requested Role</p>
              <p className="text-xs font-semibold text-white">Teacher</p>
            </div>
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-200/90">
        <Clock className="h-4 w-4 flex-none text-amber-400 mt-0.5" />
        <p className="leading-relaxed">
          Your enrollment request is in your Class Representative&apos;s queue. Once approved, your daily subjects, attendance registers, and attendance analytics will unlock automatically.
        </p>
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-[var(--text-muted)]">
          Need changes? Contact your CR to review your application.
        </span>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="button-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Check Approval Status</span>
          </button>
        )}
      </div>
    </div>
  );
}
