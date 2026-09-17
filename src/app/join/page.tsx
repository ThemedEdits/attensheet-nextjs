"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import { toTitleCase } from "@/lib/title-case";
import { PendingRequestCard, type PendingClassRequest } from "@/components/PendingRequestCard";
import { firebaseAuth } from "@/lib/firebase";
import { ArrowLeft, KeyRound, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [userRole, setUserRole] = useState<string>("student");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [pendingRequest, setPendingRequest] = useState<PendingClassRequest | null>(null);
  const [touched, setTouched] = useState<{
    code?: boolean;
    fullName?: boolean;
    fatherName?: boolean;
    seatNumber?: boolean;
  }>({});
  const [fieldErrors, setFieldErrors] = useState<{
    code?: string;
    fullName?: string;
    fatherName?: string;
    seatNumber?: string;
  }>({});

  const checkPendingStatus = async () => {
    try {
      const response = await fetch("/api/dashboard", { headers: await authHeaders() });
      const result = await readApiResponse(response);
      if (response.ok && result.profile) {
        if ((result.profile as { role?: string }).role) {
          setUserRole((result.profile as { role?: string }).role || "student");
        }
      }
      if (response.ok && result.pendingRequest) {
        setPendingRequest(result.pendingRequest as PendingClassRequest);
      } else {
        setPendingRequest(null);
      }
    } catch {
      // Ignore initial background check error
    } finally {
      setCheckingExisting(false);
    }
  };

  useEffect(() => {
    void checkPendingStatus();

    // Auto-fill from URL params or stored invite code
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryCode = params.get("code") || params.get("classCode");
      const storedCode = localStorage.getItem("attensheet_invite_code");
      const targetCode = queryCode || storedCode;

      if (targetCode) {
        setCode(targetCode.trim().toUpperCase());
        localStorage.removeItem("attensheet_invite_code");
      }

      if (firebaseAuth.currentUser?.displayName) {
        setFullName((prev) => prev || firebaseAuth.currentUser?.displayName || "");
      }
    }
  }, []);

  function validate(fields?: { code?: string; fullName?: string; fatherName?: string; seatNumber?: string }) {
    const c = fields?.code !== undefined ? fields.code : code;
    const fn = fields?.fullName !== undefined ? fields.fullName : fullName;
    const fa = fields?.fatherName !== undefined ? fields.fatherName : fatherName;
    const sn = fields?.seatNumber !== undefined ? fields.seatNumber : seatNumber;

    const errors: {
      code?: string;
      fullName?: string;
      fatherName?: string;
      seatNumber?: string;
    } = {};

    if (!c.trim()) {
      errors.code = "Class access code is required.";
    } else if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c.trim().toUpperCase())) {
      errors.code = "Class code must be 8 characters in ABCD-1234 format.";
    }

    if (!fn.trim()) {
      errors.fullName = "Full name is required.";
    } else if (fn.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters.";
    }

    if (userRole === "student") {
      if (!fa.trim()) {
        errors.fatherName = "Father's name is required for university records.";
      } else if (fa.trim().length < 2) {
        errors.fatherName = "Father's name must be at least 2 characters.";
      }

      if (!sn.trim()) {
        errors.seatNumber = "Seat number is required (e.g. BSCS-01).";
      } else if (!/^[A-Za-z0-9-]{1,12}$/.test(sn.trim())) {
        errors.seatNumber = "Seat number can only contain letters, numbers, and hyphens.";
      }
    }

    setFieldErrors(errors);
    return errors;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    setTouched({ code: true, fullName: true, fatherName: true, seatNumber: true });
    const errors = validate();
    const errorMessages = Object.values(errors);
    if (errorMessages.length > 0) {
      setMessage(`Please fill in all required fields:\n• ${errorMessages.join("\n• ")}`);
      return;
    }

    setBusy(true);

    const formattedFullName = toTitleCase(fullName);
    const formattedFatherName = toTitleCase(fatherName);

    try {
      const response = await fetch("/api/class/join", {
        method: "POST",
        headers: await authHeaders(true),
        body: JSON.stringify({
          classCode: code.trim(),
          fullName: formattedFullName,
          fatherName: formattedFatherName,
          seatNumber: seatNumber.trim(),
        }),
      });
      const result = await readApiResponse(response);
      if (response.ok) {
        setIsSuccess(true);
        if (result.pendingRequest) {
          setPendingRequest(result.pendingRequest as PendingClassRequest);
        } else {
          setPendingRequest({
            id: String(result.id ?? "pending"),
            classId: "",
            className: "Class Workspace",
            classCode: code.trim(),
            fullName: formattedFullName,
            fatherName: formattedFatherName,
            seatNumber: seatNumber.trim(),
            status: "pending",
          });
        }
        setMessage("Request submitted! Your Class Representative must approve it before you can view subjects.");
      } else {
        const errorText = String(result.error ?? "Unable to join class. Please verify the code.");
        setMessage(errorText);
        // Also map to field error if specific
        if (errorText.toLowerCase().includes("seat")) {
          setFieldErrors((prev) => ({ ...prev, seatNumber: errorText }));
        } else if (errorText.toLowerCase().includes("code")) {
          setFieldErrors((prev) => ({ ...prev, code: errorText }));
        }
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
          {pendingRequest ? "Your Enrollment Request" : "Enter Your Class Code"}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
          {pendingRequest 
            ? "You have already submitted a join request. Here are your class and application details."
            : "Ask your Class Representative for the 8-character class code to request membership."}
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

      {checkingExisting ? (
        <div className="mt-8 card p-8 text-center animate-pulse">
          <div className="h-6 w-48 mx-auto rounded bg-[var(--surface-elevated)]" />
          <div className="mt-3 h-4 w-64 mx-auto rounded bg-[var(--surface-elevated)]" />
        </div>
      ) : pendingRequest ? (
        <div className="mt-8">
          <PendingRequestCard 
            request={pendingRequest}
            onRefresh={checkPendingStatus}
          />
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 card p-6 sm:p-8 space-y-4" noValidate>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Class Access Code <span className="text-red-400">*</span>
              </label>
              {touched.code && fieldErrors.code && (
                <span className="text-[11px] text-red-400 font-medium">Required</span>
              )}
            </div>
            <input
              name="classCode"
              required
              value={code}
              onChange={(event) => {
                const val = event.target.value.toUpperCase();
                setCode(val);
                if (touched.code) validate({ code: val });
              }}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, code: true }));
                validate();
              }}
              className={`field mt-1.5 text-center font-mono text-lg font-bold tracking-widest uppercase transition-all ${
                touched.code && fieldErrors.code ? "border-red-500/70 ring-1 ring-red-500/20 bg-red-500/[0.02]" : ""
              }`}
              placeholder="ABCD-2345"
              maxLength={9}
            />
            {touched.code && fieldErrors.code && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 flex-none text-red-400" />
                <span>{fieldErrors.code}</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Your Full Name <span className="text-red-400">*</span>
              </label>
              {touched.fullName && fieldErrors.fullName && (
                <span className="text-[11px] text-red-400 font-medium">Required</span>
              )}
            </div>
            <input
              name="fullName"
              required
              value={fullName}
              onChange={(e) => {
                const val = e.target.value;
                setFullName(val);
                if (touched.fullName) validate({ fullName: val });
              }}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, fullName: true }));
                if (fullName.trim()) setFullName(toTitleCase(fullName));
                validate();
              }}
              className={`field mt-1.5 transition-all ${
                touched.fullName && fieldErrors.fullName ? "border-red-500/70 ring-1 ring-red-500/20 bg-red-500/[0.02]" : ""
              }`}
              placeholder="e.g. Hammad Ahmed"
            />
            {touched.fullName && fieldErrors.fullName && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 flex-none text-red-400" />
                <span>{fieldErrors.fullName}</span>
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Father Name {userRole === "student" && <span className="text-red-400">*</span>}
                </label>
                {touched.fatherName && fieldErrors.fatherName && (
                  <span className="text-[11px] text-red-400 font-medium">Required</span>
                )}
              </div>
              <input
                name="fatherName"
                value={fatherName}
                onChange={(e) => {
                  const val = e.target.value;
                  setFatherName(val);
                  if (touched.fatherName) validate({ fatherName: val });
                }}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, fatherName: true }));
                  if (fatherName.trim()) setFatherName(toTitleCase(fatherName));
                  validate();
                }}
                className={`field mt-1.5 transition-all ${
                  touched.fatherName && fieldErrors.fatherName ? "border-red-500/70 ring-1 ring-red-500/20 bg-red-500/[0.02]" : ""
                }`}
                placeholder="e.g. Tariq Ahmed"
              />
              {touched.fatherName && fieldErrors.fatherName && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 flex-none text-red-400" />
                  <span>{fieldErrors.fatherName}</span>
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Seat Number {userRole === "student" && <span className="text-red-400">*</span>}
                </label>
                {touched.seatNumber && fieldErrors.seatNumber && (
                  <span className="text-[11px] text-red-400 font-medium">Required</span>
                )}
              </div>
              <input
                name="seatNumber"
                value={seatNumber}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setSeatNumber(val);
                  if (touched.seatNumber) validate({ seatNumber: val });
                }}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, seatNumber: true }));
                  validate();
                }}
                className={`field mt-1.5 font-mono uppercase transition-all ${
                  touched.seatNumber && fieldErrors.seatNumber ? "border-red-500/70 ring-1 ring-red-500/20 bg-red-500/[0.02]" : ""
                }`}
                placeholder="e.g. EP1950001"
              />
              {touched.seatNumber && fieldErrors.seatNumber && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 flex-none text-red-400" />
                  <span>{fieldErrors.seatNumber}</span>
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
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
      )}
    </main>
  );
}
