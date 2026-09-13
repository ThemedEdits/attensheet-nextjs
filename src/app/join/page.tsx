"use client";

import { useState } from "react";
import Link from "next/link";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import { ArrowLeft, KeyRound, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setIsSuccess(false);
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch("/api/class/join", {
        method: "POST",
        headers: await authHeaders(true),
        body: JSON.stringify(data),
      });
      const result = await readApiResponse(response);
      if (response.ok) {
        setIsSuccess(true);
        setMessage("Request submitted! Your Class Representative must approve it before you can view subjects.");
      } else {
        setMessage(String(result.error ?? "Unable to join class. Please verify the code."));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit the request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
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
          <KeyRound className="h-3.5 w-3.5" />
          <span>Class Enrollment</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Enter Your Class Code
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
          Ask your Class Representative for the 8-character class code to request membership.
        </p>
      </div>

      {message && (
        <div className={`mt-6 flex items-start gap-2.5 rounded-xl border p-4 text-xs sm:text-sm ${
          isSuccess 
            ? "border-[var(--border-hover)] bg-[var(--accent-soft)] text-[var(--accent)]" 
            : "border-red-500/30 bg-red-500/10 text-red-200"
        }`}>
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4 flex-none text-[var(--accent)] mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-none text-red-400 mt-0.5" />
          )}
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={submit} className="mt-8 card p-6 sm:p-8 space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)]">
            Class Access Code
          </label>
          <input
            name="classCode"
            required
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            className="field mt-1.5 text-center font-mono text-lg font-bold tracking-widest uppercase"
            placeholder="ABCD-2345"
            maxLength={9}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)]">
            Your Full Name
          </label>
          <input
            name="fullName"
            required
            className="field mt-1.5"
            placeholder="e.g. Hammad Ahmed"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Father Name <span className="text-[var(--text-muted)]">(for students)</span>
            </label>
            <input
              name="fatherName"
              className="field mt-1.5"
              placeholder="e.g. Tariq Ahmed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Seat Number <span className="text-[var(--text-muted)]">(for students)</span>
            </label>
            <input
              name="seatNumber"
              className="field mt-1.5 font-mono"
              placeholder="e.g. EP1950001"
            />
          </div>
        </div>

        <button
          disabled={busy || !code.trim()}
          className="button-primary w-full mt-4 py-3"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Submitting request...</span>
            </>
          ) : (
            <>
              <span>Request to Join Class</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </main>
  );
}

