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
        {loading ? (
          <div>
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
              <div className="skeleton h-9 w-56 rounded-xl" />
              <div className="skeleton h-9 w-32 rounded-xl" />
            </div>
          </div>
        ) : (
          <>
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
                    : "Connect your Google account from the main dashboard to create and sync a master workbook."}
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
              {isConnected && classRecord?.spreadsheetId && (
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://docs.google.com/spreadsheets/d/${classRecord.spreadsheetId}`}
                  className="button-primary text-xs"
                >
                  <span>Open Spreadsheet in Google Sheets</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <Link href="/dashboard" className="button-secondary text-xs">
                Back to Dashboard
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

