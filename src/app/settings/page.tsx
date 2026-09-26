"use client";

import { onAuthStateChanged, sendPasswordResetEmail, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { firebaseAuth } from "@/lib/firebase";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import { useToast } from "@/components/ToastProvider";
import { ArrowLeft, User, Mail, Shield, KeyRound, LogOut, Sparkles, GraduationCap, Users, Hash } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ 
    name?: string; 
    email?: string; 
    role?: string; 
    actualRole?: string;
    fullName?: string;
    fatherName?: string;
    seatNumber?: string;
    photoURL?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) {
        window.location.href = "/login";
      }
    });
    return () => unsubscribe();
  }, []);

  async function handleSignOut() {
    try {
      await signOut(firebaseAuth);
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("attensheet_role");
        localStorage.removeItem("attensheet_secondary_cr");
        localStorage.removeItem("attensheet_install_dismissed");
        window.location.href = "/login";
      }
    }
  }

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const response = await fetch("/api/dashboard", { headers: await authHeaders() });
        const result = await readApiResponse(response);
        if (response.ok && mounted) {
          setProfile((result.profile ?? {}) as typeof profile);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function resetPassword() {
    const email = profile.email ?? firebaseAuth.currentUser?.email;
    if (!email) return;
    setResetting(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
      toast("Password reset email sent. Check your inbox.", "success");
    } catch {
      toast("Unable to send password reset email.", "error");
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link Skeleton */}
        <div className="skeleton h-4 w-32 rounded-md" />

        {/* Header Skeleton */}
        <div className="mt-4 space-y-2">
          <div className="skeleton h-4 w-24 rounded-full" />
          <div className="skeleton h-8 w-56 rounded-xl" />
          <div className="skeleton h-4 w-72 sm:w-96 rounded-md" />
        </div>

        {/* Profile Card Skeleton */}
        <section className="mt-8 card p-6 sm:p-8">
          {/* Profile Card Header Skeleton */}
          <div className="flex items-center gap-4 pb-6 border-b border-[var(--border)]">
            <div className="skeleton h-14 w-14 rounded-2xl" />
            <div className="space-y-2">
              <div className="skeleton h-5 w-40 rounded-md" />
              <div className="skeleton h-3.5 w-48 rounded-md" />
            </div>
          </div>

          {/* Profile Details Rows Skeleton */}
          <div className="mt-6 divide-y divide-[var(--border)]">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="skeleton h-4 w-4 rounded" />
                  <div className="space-y-1.5">
                    <div className="skeleton h-3 w-16 rounded" />
                    <div className="skeleton h-4 w-36 rounded-md" />
                  </div>
                </div>
                {row === 3 && <div className="skeleton h-6 w-20 rounded-full" />}
              </div>
            ))}
          </div>

          {/* Actions Skeleton */}
          <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-wrap items-center gap-3">
            <div className="skeleton h-9 w-40 rounded-xl" />
            <div className="skeleton h-9 w-28 rounded-xl" />
          </div>
        </section>
      </main>
    );
  }

  const email = profile.email ?? firebaseAuth.currentUser?.email ?? "Not available";
  const initials = profile.name ? profile.name.charAt(0).toUpperCase() : "U";

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
          <span>User Profile</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Account Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
          Manage your university profile, academic credentials, and security settings.
        </p>
      </div>

      <section className="mt-8 card p-6 sm:p-8">
        {/* Profile Card Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-[var(--border)]">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="Avatar" className="h-16 w-16 rounded-2xl object-cover border border-[var(--border)] shadow-md" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] text-2xl font-bold text-[var(--accent)] shadow-inner">
              {initials}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-white sm:text-xl">
              {profile.fullName ?? profile.name ?? "University Member"}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {email}
            </p>
          </div>
        </div>

        {/* Profile Details Rows */}
        <div className="mt-6 divide-y divide-[var(--border)]">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-[var(--text-muted)]" />
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">Full Name</p>
                <p className="text-sm font-semibold text-white mt-0.5">{profile.fullName ?? profile.name ?? "Not provided"}</p>
              </div>
            </div>
          </div>

          {(profile.role === "student" || profile.fatherName) && (
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)]">Father's Name</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{profile.fatherName || "Not provided"}</p>
                </div>
              </div>
            </div>
          )}

          {(profile.role === "student" || profile.seatNumber) && (
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Hash className="h-4 w-4 text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)]">Seat Number</p>
                  <p className="text-sm font-semibold text-white mt-0.5 uppercase">{profile.seatNumber || "Not assigned"}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-[var(--text-muted)]" />
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">Email Address</p>
                <p className="text-sm font-semibold text-white mt-0.5">{email}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-[var(--text-muted)]" />
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">Assigned Role</p>
                <p className="text-sm font-semibold text-white capitalize mt-0.5">
                  {profile.actualRole === "cr" && profile.role === "student" ? "CR (Viewing as Student)" : profile.role ?? "Student"}
                </p>
              </div>
            </div>
            <span className="badge-present text-xs capitalize">
              {profile.role ?? "Student"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-wrap items-center gap-3">
          {profile.actualRole === "cr" && (
            <button
              type="button"
              onClick={() => {
                if (profile.role === "student") {
                  document.cookie = "attensheet_view_as_student=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                } else {
                  document.cookie = "attensheet_view_as_student=true; path=/";
                }
                window.location.reload();
              }}
              className="button-primary text-xs inline-flex items-center gap-2"
            >
              <User className="h-3.5 w-3.5" />
              <span>{profile.role === "student" ? "Switch back to CR profile" : "View as student"}</span>
            </button>
          )}

          <button
            type="button"
            disabled={resetting}

            onClick={() => void resetPassword()}
            className="button-secondary text-xs inline-flex items-center gap-2"
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>{resetting ? "Sending reset email..." : "Send password reset"}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="button-danger text-xs inline-flex items-center gap-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </section>
    </main>
  );
}

