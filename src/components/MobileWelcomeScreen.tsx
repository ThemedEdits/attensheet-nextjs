"use client";

import Link from "next/link";
import { 
  LogIn, 
  UserPlus, 
  GraduationCap, 
  Sparkles, 
  CheckCircle2, 
  FileSpreadsheet, 
  ShieldCheck, 
  ArrowRight,
  Globe
} from "lucide-react";

export function MobileWelcomeScreen({ onShowFullWebsite }: { onShowFullWebsite?: () => void }) {
  return (
    <div className="relative min-h-[90vh] flex flex-col justify-between px-5 py-8 select-none">
      {/* Top Ambient Glow */}
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-emerald-500/15 blur-[90px]" />

      {/* Top Bar: Brand & Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0D1C16] border border-[var(--border)] shadow-md">
            <img 
              src="/attensheetlogo.svg" 
              alt="AttenSheet" 
              className="h-5 w-auto object-contain" 
            />
          </div>
          <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">
            Atten<span className="text-[var(--accent)]">Sheet</span>
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
          <Sparkles className="h-3 w-3 text-emerald-400" />
          <span>v1.0 Mobile</span>
        </div>
      </div>

      {/* Center Hero Section */}
      <div className="relative z-10 my-auto py-8 text-center flex flex-col items-center">
        {/* Large Brand Icon with Animated Glowing Rings */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#16A66A]/30 to-[#35D98A]/20 blur-xl animate-pulse" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-[var(--border-hover)] bg-[#0D1C16] shadow-2xl shadow-[#16A66A]/20">
            <img 
              src="/attensheetlogo.svg" 
              alt="AttenSheet" 
              className="h-14 w-14 object-contain drop-shadow-[0_4px_16px_rgba(53,217,138,0.5)]" 
            />
          </div>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
          Atten<span className="text-[var(--accent)]">Sheet</span>
        </h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#71847C]">
          University Attendance Platform
        </p>

        <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">
          Smart classroom roll calls, instant Google Sheets registers, and live student attendance tracking.
        </p>

        {/* Feature Highlights Pills */}
        <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-sm">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[#0B1813] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>30s Fast Roll Call</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[#0B1813] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>Google Sheets Sync</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[#0B1813] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
            <span>CR & Teacher Portals</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Section: Primary Buttons */}
      <div className="relative z-10 space-y-3 pt-4">
        {/* Sign In (Primary Action) */}
        <Link
          href="/login"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#16A66A] to-[#0D7A4D] py-4 px-6 text-base font-bold text-white shadow-xl shadow-[#16A66A]/25 transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <LogIn className="h-5 w-5" />
          <span>Sign In to Your Account</span>
        </Link>

        {/* Create Account (Secondary Action) */}
        <Link
          href="/signup"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border-hover)] bg-[#0D1C16] py-3.5 px-6 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[#12271E] active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4 text-[var(--accent)]" />
          <span>Create New Account</span>
        </Link>

        {/* Enter Class Code (Tertiary Action) */}
        <Link
          href="/join"
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-medium text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          <GraduationCap className="h-4 w-4 text-[var(--text-muted)]" />
          <span>Student? Join Class with Code</span>
          <ArrowRight className="h-3 w-3 text-[var(--text-muted)]" />
        </Link>

        {/* Switch to Full Website View */}
        {onShowFullWebsite && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onShowFullWebsite}
              className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <Globe className="h-3 w-3" />
              <span>Switch to desktop website view</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
