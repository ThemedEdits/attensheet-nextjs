"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import type { ClassRecord } from "@/lib/domain";
import { ArrowLeft, FileSpreadsheet, ExternalLink, Loader2, Sparkles } from "lucide-react";

export default function GooglePage() {
  const [classRecord, setClassRecord] = useState<ClassRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/dashboard", { headers: await authHeaders() });
          const result = await readApiResponse(response);
          if (response.ok) setClassRecord(result.class as ClassRecord | null);
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const isConnected = Boolean(classRecord?.spreadsheetId);

  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const toast = useToast();

  async function connectSheets() {
    if (!classRecord) return;
    setConnecting(true);
    try {
      const response = await fetch("/api/google/authorize", {
        method: "POST",
        headers: await authHeaders(true),
        body: JSON.stringify({ classId: classRecord.id }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Unable to start Google authorization."));
      if (typeof result.url === "string") {
        window.location.assign(result.url);
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to connect.", "error");
      setConnecting(false);
    }
  }

  async function disconnectSheet() {
    if (!classRecord) return;
    setDisconnecting(true);
    try {
      const response = await fetch("/api/google/disconnect", {
        method: "POST",
        headers: await authHeaders(true),
        body: JSON.stringify({ classId: classRecord.id }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(String(result.error ?? "Failed to disconnect."));
      toast("Sheet disconnected.", "success");
      setClassRecord({ ...classRecord, spreadsheetId: null });
      setConfirmDisconnect(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to disconnect.", "error");
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return <GoogleSheetsSkeleton />;
  }

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
          <span>Cloud Integration</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Google Sheets Sync
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
          Your class attendance master register and real-time synchronization status.
        </p>
      </div>

      <section className="mt-8 card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--accent)]">
            <FileSpreadsheet className="h-6 w-6" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-[var(--accent)] shadow-[0_0_8px_rgba(53,217,138,0.8)]" : "bg-amber-400"}`} />
              <h2 className="text-base font-bold text-white">
                {isConnected ? "Google Sheets Connected" : "Not Connected"}
              </h2>
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
              {isConnected
                ? "Attendance records are automatically synchronized to your dedicated class Google Sheets workbook every time roll-call is saved."
                : "Connect your Google account to create and sync a master workbook. Marking attendance requires an active sheet connection."}
            </p>
          </div>
        </div>

        {isConnected && classRecord?.spreadsheetId && (
          <div className="mt-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-4">
            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Spreadsheet ID
            </p>
            <p className="mt-1 font-mono text-xs text-white truncate">
              {classRecord.spreadsheetId}
            </p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-wrap items-center gap-3">
          {isConnected ? (
            <>
              <a
                target="_blank"
                rel="noreferrer"
                href={`https://docs.google.com/spreadsheets/d/${classRecord.spreadsheetId}`}
                className="button-primary text-xs"
              >
                <span>Open Spreadsheet</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={connectSheets}
                disabled={connecting}
                className="button-secondary text-xs"
              >
                <span>{connecting ? "Connecting..." : "Connect Another Sheet"}</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmDisconnect(true)}
                disabled={disconnecting}
                className="button-secondary text-xs hover:text-red-400 hover:border-red-500/30"
              >
                Disconnect Sheet
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={connectSheets}
              disabled={connecting}
              className="button-primary text-xs"
            >
              <span>{connecting ? "Connecting..." : "Connect Sheets"}</span>
            </button>
          )}
        </div>
      </section>

      {confirmDisconnect && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-hover)] bg-[var(--surface)] p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white">Disconnect Sheet?</h3>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              This will disable attendance recording until a new sheet is connected. Your existing Google Sheet will not be deleted, but it will no longer receive updates.
            </p>
            <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDisconnect(false)}
                className="button-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={disconnectSheet}
                disabled={disconnecting}
                className="button-danger text-xs py-2 px-4"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function GoogleSheetsSkeleton() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Link Skeleton */}
      <div className="skeleton h-3.5 w-28 rounded-md" />

      {/* Header Skeleton */}
      <div className="mt-4">
        <div className="flex items-center gap-2">
          <div className="skeleton h-3.5 w-3.5 rounded-full" />
          <div className="skeleton h-3.5 w-32 rounded-md" />
        </div>
        <div className="mt-1 skeleton h-8 sm:h-9 w-60 rounded-xl" />
        <div className="mt-1.5 skeleton h-4 w-72 sm:w-96 rounded-md" />
      </div>

      {/* Sync Card Skeleton */}
      <section className="mt-8 card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="skeleton h-12 w-12 flex-none rounded-2xl" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="skeleton h-2.5 w-2.5 rounded-full" />
              <div className="skeleton h-5 w-48 rounded" />
            </div>
            <div className="mt-2.5 skeleton h-3.5 w-full max-w-md rounded" />
            <div className="mt-1.5 skeleton h-3.5 w-3/4 rounded" />
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-4">
          <div className="skeleton h-3 w-28 rounded" />
          <div className="mt-2 skeleton h-4 w-64 rounded" />
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-wrap items-center gap-3">
          <div className="skeleton h-9 w-52 rounded-xl" />
          <div className="skeleton h-9 w-32 rounded-xl" />
        </div>
      </section>
    </main>
  );
}

