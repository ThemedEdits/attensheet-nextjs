"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  CheckCircle2, 
  FileSpreadsheet, 
  FileText,
  Download,
  ShieldCheck, 
  Sparkles, 
  Users, 
  GraduationCap, 
  Clock,
  Menu,
  X,
  Check,
  ChevronDown,
  RotateCcw,
  Smartphone,
  Layers,
  Database,
  ExternalLink,
  UserCheck
} from "lucide-react";

type RoleTab = "cr" | "teacher" | "student";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeRole, setActiveRole] = useState<RoleTab>("cr");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Interactive roll call demo state
  const [demoStudents, setDemoStudents] = useState([
    { seat: "BSCS-01", name: "Hammad Ahmed", present: true },
    { seat: "BSCS-02", name: "Ayesha Malik", present: true },
    { seat: "BSCS-03", name: "Bilal Farooq", present: false },
    { seat: "BSCS-04", name: "Zainab Raza", present: true },
    { seat: "BSCS-05", name: "Danial Khan", present: true },
  ]);
  const [demoSyncing, setDemoSyncing] = useState(false);

  const toggleStudent = (index: number) => {
    setDemoStudents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], present: !next[index].present };
      return next;
    });
    triggerSimulatedSync();
  };

  const markAll = (status: boolean) => {
    setDemoStudents((prev) => prev.map((s) => ({ ...s, present: status })));
    triggerSimulatedSync();
  };

  const triggerSimulatedSync = () => {
    setDemoSyncing(true);
    setTimeout(() => setDemoSyncing(false), 900);
  };

  const presentCount = demoStudents.filter((s) => s.present).length;
  const attendanceRate = Math.round((presentCount / demoStudents.length) * 100);

  const faqs = [
    {
      q: "Can students mark attendance for themselves or friends?",
      a: "No. AttenSheet enforces strict role-based access. Only authorized Class Representatives and assigned Course Teachers can mark and submit attendance registers. Students only have read access to monitor their own logs and eligibility.",
    },
    {
      q: "How does the Google Sheets synchronization work?",
      a: "When a CR sets up a class, AttenSheet generates dedicated tabs inside your connected Google Sheet. Every time attendance is marked, a new dated column is created with P/A entries and summary formulas automatically.",
    },
    {
      q: "What formats can we download attendance in?",
      a: "You can download full registers in 3 formats anytime: Excel (.xlsx) with pre-filled formulas and student totals, high-resolution printable PDF (.pdf) with university header metadata, or open the live synced Google Sheet directly.",
    },
    {
      q: "What if our CR is absent or busy?",
      a: "AttenSheet allows the primary CR to appoint a verified Secondary CR from among approved class students. The Secondary CR has permissions to take daily roll calls while keeping administrative ownership safe.",
    },
    {
      q: "How do students join their class workspace?",
      a: "CRs or teachers copy a single share invite link from their dashboard and post it to the class WhatsApp group. Students click, sign up, enter their seat number and father name, and are enrolled once the CR taps 'Approve'.",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Background Gradients */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/[0.08] blur-[140px]" />
        <div className="absolute top-[40%] right-[-10%] h-[500px] w-[600px] rounded-full bg-teal-600/[0.05] blur-[120px]" />
        <div className="absolute bottom-[10%] left-[-5%] h-[400px] w-[500px] rounded-full bg-emerald-700/[0.06] blur-[130px]" />
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)]/70 bg-[var(--bg-primary)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img 
              src="/attensheetlogo.svg" 
              alt="AttenSheet" 
              className="h-8 w-auto object-contain transition-transform group-hover:scale-105" 
            />
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white">
                Atten<span className="text-[var(--accent)]">Sheet</span>
              </span>
              <span className="rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] px-1.5 py-0.2 text-[10px] font-semibold text-[var(--accent)]">
                v1.2
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-[var(--text-secondary)]">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#interactive-demo" className="hover:text-white transition-colors">Live Preview</a>
            <a href="#roles" className="hover:text-white transition-colors">Who it&apos;s for</a>
            <a href="#exports" className="hover:text-white transition-colors">Exports & Sync</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* Desktop Right CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-white transition-colors px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="button-primary text-xs py-2 px-4 shadow-lg shadow-emerald-950/40 inline-flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((c) => !c)}
            className="md:hidden rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-white"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col space-y-2 text-sm font-medium text-[var(--text-secondary)]">
              <a 
                href="#how-it-works" 
                onClick={() => setMobileMenuOpen(false)} 
                className="py-1.5 hover:text-white"
              >
                How it works
              </a>
              <a 
                href="#interactive-demo" 
                onClick={() => setMobileMenuOpen(false)} 
                className="py-1.5 hover:text-white"
              >
                Live Preview
              </a>
              <a 
                href="#roles" 
                onClick={() => setMobileMenuOpen(false)} 
                className="py-1.5 hover:text-white"
              >
                Who it&apos;s for
              </a>
              <a 
                href="#exports" 
                onClick={() => setMobileMenuOpen(false)} 
                className="py-1.5 hover:text-white"
              >
                Exports & Sync
              </a>
              <a 
                href="#faq" 
                onClick={() => setMobileMenuOpen(false)} 
                className="py-1.5 hover:text-white"
              >
                FAQ
              </a>
            </div>
            <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
              <Link
                href="/login"
                className="button-secondary text-xs text-center py-2.5"
              >
                Sign in to workspace
              </Link>
              <Link
                href="/signup"
                className="button-primary text-xs text-center py-2.5 justify-center flex items-center gap-1.5"
              >
                <span>Create your class free</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-hover)] bg-[var(--accent-soft)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Built by university students, for university classes</span>
          </div>

          {/* Main Title */}
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl sm:leading-[1.15]">
            Ditch paper registers.<br />
            <span className="bg-gradient-to-r from-[var(--accent)] via-emerald-400 to-teal-200 bg-clip-text text-transparent">
              Run lecture roll-call in 30 seconds.
            </span>
          </h1>

          {/* Description */}
          <p className="mt-5 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] max-w-2xl">
            AttenSheet solves the everyday chaos of university attendance. Class Representatives organize the roster once, teachers tap attendance right from their phones, and Google Sheets stays automatically synchronized in real-time.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
            <Link
              href="/signup"
              className="button-primary w-full sm:w-auto px-7 py-3 text-xs sm:text-sm font-semibold shadow-xl shadow-emerald-950/60 inline-flex items-center justify-center gap-2"
            >
              <span>Setup Your Class Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#interactive-demo"
              className="button-secondary w-full sm:w-auto px-6 py-3 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <Smartphone className="h-4 w-4 text-[var(--accent)]" />
              <span>Try Interactive Demo</span>
            </a>
          </div>

          {/* Trust Highlights */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left w-full max-w-3xl pt-8 border-t border-[var(--border)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <CheckCircle2 className="h-4 w-4 text-[var(--accent)] flex-none" />
              <span>No lost paper sheets</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <FileSpreadsheet className="h-4 w-4 text-[var(--accent)] flex-none" />
              <span>Live Google Sheets sync</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Download className="h-4 w-4 text-[var(--accent)] flex-none" />
              <span>Excel & PDF exports</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)] flex-none" />
              <span>Zero proxy attendance</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Roll-Call Demo Section */}
      <section id="interactive-demo" className="relative z-10 mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl sm:rounded-3xl border border-[var(--border-hover)] bg-[var(--surface)] p-4 sm:p-8 shadow-2xl shadow-black/80 relative overflow-hidden">
          {/* Subtle top decoration */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none" />

          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-ping" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent)]">
                  Live Interactive Simulation
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                Experience the 30-Second Roll Call
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Tap any student below to toggle Present / Absent and watch the live ledger respond.
              </p>
            </div>

            {/* Simulated Sync Pill */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                demoSyncing 
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse" 
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}>
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>{demoSyncing ? "Syncing Google Sheet..." : "Google Sheet Synced"}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markAll(true)}
                className="button-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Mark all present</span>
              </button>
              <button
                type="button"
                onClick={() => markAll(false)}
                className="button-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 cursor-pointer text-[var(--text-muted)] hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="badge-present text-xs py-0.5 px-2.5">
                {presentCount} Present
              </span>
              <span className="badge-absent text-xs py-0.5 px-2.5">
                {demoStudents.length - presentCount} Absent
              </span>
              <span className="rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] px-2 py-0.5 text-white">
                {attendanceRate}% Rate
              </span>
            </div>
          </div>

          {/* Student Roster Simulator List */}
          <div className="mt-4 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
            {demoStudents.map((student, idx) => (
              <div
                key={student.seat}
                onClick={() => toggleStudent(idx)}
                className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors select-none ${
                  student.present ? "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.07]" : "hover:bg-[var(--surface)]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-bold text-white rounded bg-[var(--surface-elevated)] border border-[var(--border)] px-2 py-0.5 flex-none">
                    {student.seat}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-white truncate">
                    {student.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-none">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                    student.present 
                      ? "bg-[var(--primary)] text-[#07110D]" 
                      : "bg-red-500/15 text-red-400 border border-red-500/20"
                  }`}>
                    {student.present ? "PRESENT" : "ABSENT"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Micro Note below Demo */}
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>In real usage, roll-call takes less than 30 seconds for an entire section of 60 students.</span>
            </span>
            <span className="font-mono text-[11px]">Timezone: Asia/Karachi</span>
          </div>
        </div>
      </section>

      {/* How It Actually Works Section (Step by Step) */}
      <section id="how-it-works" className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
            The Complete Workflow
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl">
            How AttenSheet works in your classroom
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-[var(--text-secondary)]">
            No complicated installations or server setups. Set up once at the start of semester and let it run automatically.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Step 1 */}
          <div className="card p-6 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border)]">
                  <Database className="h-5 w-5" />
                </div>
                <span className="text-xs font-mono font-bold text-[var(--text-muted)]">01</span>
              </div>
              <h3 className="mt-4 text-base font-bold text-white">Create Class Workspace</h3>
              <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                The Class Representative inputs class details (e.g. BSCS 6th, Section A), adds semester subjects, and links a Google Sheet ledger with one authorization click.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--accent)] font-medium">
              Takes 60 seconds
            </div>
          </div>

          {/* Step 2 */}
          <div className="card p-6 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-xs font-mono font-bold text-[var(--text-muted)]">02</span>
              </div>
              <h3 className="mt-4 text-base font-bold text-white">Share 1-Click WhatsApp Invite</h3>
              <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                CR shares the pre-formatted invite link to the class group. Students enter their seat number and father name. The CR reviews and approves real students, blocking proxies.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border)] text-[11px] text-blue-400 font-medium">
              Verified Student Roster
            </div>
          </div>

          {/* Step 3 */}
          <div className="card p-6 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="text-xs font-mono font-bold text-[var(--text-muted)]">03</span>
              </div>
              <h3 className="mt-4 text-base font-bold text-white">Mark Daily Attendance</h3>
              <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                During lectures, the teacher or CR opens the subject and taps student names or uses keyboard roll-call. Saving immediately pushes a new dated column into Google Sheets.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border)] text-[11px] text-emerald-400 font-medium">
              Instant Google Sync
            </div>
          </div>

          {/* Step 4 */}
          <div className="card p-6 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Download className="h-5 w-5" />
                </div>
                <span className="text-xs font-mono font-bold text-[var(--text-muted)]">04</span>
              </div>
              <h3 className="mt-4 text-base font-bold text-white">Download Exam Registers</h3>
              <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                At semester end or midterms, download official Excel or styled PDF registers with exact lecture counts and percentage stats ready for department submission.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border)] text-[11px] text-purple-400 font-medium">
              Exam Clearance Ready
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Features Spotlight */}
      <section id="roles" className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
            Tailored For Academic Roles
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Who uses AttenSheet?
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)]">
            Every person in your batch gets a dedicated, distraction-free workspace suited for their role.
          </p>
        </div>

        {/* Role Tabs Picker */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveRole("cr")}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeRole === "cr"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-hover)]"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              Class Representative (CR)
            </button>
            <button
              type="button"
              onClick={() => setActiveRole("teacher")}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeRole === "teacher"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-hover)]"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              Course Teachers
            </button>
            <button
              type="button"
              onClick={() => setActiveRole("student")}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeRole === "student"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-hover)]"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              University Students
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="mt-8">
          {activeRole === "cr" && (
            <div className="card p-6 sm:p-8 grid gap-8 md:grid-cols-2 items-center animate-in fade-in duration-200">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--accent)]">
                  <ShieldCheck className="h-4 w-4" />
                  <span>The CR Command Center</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Stop compiling registers manually every weekend.
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  As a CR, keeping paper registers safe and responding to 50 students asking for their attendance percentage is exhausting. AttenSheet automates the busywork completely.
                </p>
                <ul className="space-y-2.5 text-xs text-[var(--text-secondary)] pt-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--accent)] flex-none mt-0.5" />
                    <span>Approve incoming student and teacher join requests with roll number validation.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--accent)] flex-none mt-0.5" />
                    <span>Assign teachers to specific course subjects with live permission isolation.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--accent)] flex-none mt-0.5" />
                    <span>Appoint a Secondary CR to take attendance when you are unavailable.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--accent)] flex-none mt-0.5" />
                    <span>1-click WhatsApp class invite link with your 8-digit class code.</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <span className="text-xs font-bold text-white">CR Class Control</span>
                  <span className="badge-present text-[10px]">Active Session</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white">Pending Requests</p>
                      <p className="text-[10px] text-[var(--text-muted)]">3 students awaiting verification</p>
                    </div>
                    <span className="rounded bg-amber-500/20 text-amber-300 px-2 py-0.5 font-mono text-[11px] font-bold">Review</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white">Student vs Teacher Directory</p>
                      <p className="text-[10px] text-[var(--text-muted)]">View faculty subjects & student seat numbers</p>
                    </div>
                    <span className="text-[var(--accent)] font-mono text-[11px]">54 Enrolled</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeRole === "teacher" && (
            <div className="card p-6 sm:p-8 grid gap-8 md:grid-cols-2 items-center animate-in fade-in duration-200">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
                  <GraduationCap className="h-4 w-4" />
                  <span>For Course Teachers & Professors</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Mark lecture attendance in seconds, not 15 minutes.
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  No carrying paper files or asking CRs to update Excel files. Log into AttenSheet on your phone or laptop during lecture, mark your roll call, and submit.
                </p>
                <ul className="space-y-2.5 text-xs text-[var(--text-secondary)] pt-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 flex-none mt-0.5" />
                    <span>Instant roll call with quick-mark &apos;Enter&apos; keyboard shortcuts.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 flex-none mt-0.5" />
                    <span>&apos;Mark all present&apos; button to quickly unmark only absentees.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 flex-none mt-0.5" />
                    <span>Only access and mark your own assigned course subjects.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 flex-none mt-0.5" />
                    <span>Download subject-specific attendance registers as Excel or PDF anytime.</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <span className="text-xs font-bold text-white">Teacher Roll-Call</span>
                  <span className="badge-present text-[10px]">Your Subjects</span>
                </div>
                <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">Artificial Intelligence</span>
                    <span className="text-[var(--accent)] font-bold">48 / 52 Present</span>
                  </div>
                  <div className="w-full bg-[var(--surface-elevated)] h-2 rounded-full overflow-hidden">
                    <div className="bg-[var(--accent)] h-full w-[92%]" />
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] pt-1">
                    <span>92% Class Attendance</span>
                    <span>17 Sep Lecture</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeRole === "student" && (
            <div className="card p-6 sm:p-8 grid gap-8 md:grid-cols-2 items-center animate-in fade-in duration-200">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                  <UserCheck className="h-4 w-4" />
                  <span>For Class Students</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Know your exam eligibility percentage anytime.
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  Never face sudden exam debarment due to short attendance. Monitor your live percentage across every subject and see exact lecture dates marked Present or Absent.
                </p>
                <ul className="space-y-2.5 text-xs text-[var(--text-secondary)] pt-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
                    <span>Real-time percentage tracker against the university 75% exam threshold.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
                    <span>Transparent dated attendance history for each course subject.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
                    <span>Safe read-only portal: your records cannot be modified accidentally.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
                    <span>Instant notification when CR approves your class joining request.</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <span className="text-xs font-bold text-white">Student Portal Preview</span>
                  <span className="text-[10px] font-mono text-[var(--accent)]">BSCS-2022-04</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                    <p className="text-[10px] text-[var(--text-muted)]">Overall Attendance</p>
                    <p className="text-lg font-extrabold text-[var(--accent)] mt-1">86%</p>
                    <p className="text-[10px] text-emerald-400 font-medium">Eligible for Finals</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                    <p className="text-[10px] text-[var(--text-muted)]">Lectures Attended</p>
                    <p className="text-lg font-extrabold text-white mt-1">38 / 44</p>
                    <p className="text-[10px] text-[var(--text-muted)]">6 absents recorded</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Exports & Google Sheets Feature Section */}
      <section id="exports" className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="card p-6 sm:p-10 border border-[var(--border-hover)] bg-gradient-to-b from-[var(--surface)] to-[var(--bg-secondary)]">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
              Full Document Suite
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white">
              Official Exports & Real-Time Google Sheets Sync
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Attendance data belongs to your university and department. AttenSheet makes sure you can export clean, nicely formatted files in any standard format with zero manual formatting.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {/* Format 1: Excel */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-white">Excel Spreadsheet (.xlsx)</h3>
                <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
                  Complete workbook with date columns, student roster, present/absent counters, and automated percentage calculation formulas.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <span>Subject-Specific Download</span>
              </div>
            </div>

            {/* Format 2: PDF */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-white">Official Printable PDF</h3>
                <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
                  Landscape layout with institutional header, colored attendance badges, student seat numbers, and page numbering for notice boards.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                <span>Print & Notice Board Ready</span>
              </div>
            </div>

            {/* Format 3: Google Sheets */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-white">Direct Google Sheet Tab</h3>
                <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
                  Each course subject lives as an individual tab inside your Google Drive spreadsheet. Direct 1-click link to open the live cloud sheet.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-1 text-[11px] text-sky-400 font-medium">
                <span>Automated 2-Way Ledger</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="relative z-10 mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
            Clear Answers
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mt-8 space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-semibold text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-[var(--text-muted)] transition-transform flex-none ${
                      isOpen ? "rotate-180 text-[var(--accent)]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 pt-1 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)]/40">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Authentic Creator Credits Section */}
      <section className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-5 sm:p-6 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-left">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-hover)] flex-none">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                Student Project & Creator Note
              </p>
              <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                Designed & Built by Hammad Ahmed
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                BSCS Student (6th Semester) at Federal Urdu University of Arts, Science and Technology (FUUAST).
              </p>
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)] text-center sm:text-right border-t sm:border-t-0 border-[var(--border)] pt-3 sm:pt-0 w-full sm:w-auto">
            <span>Built to solve real classroom attendance headaches for peers and faculty.</span>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-8 pb-20 sm:px-6 sm:pb-28 lg:px-8">
        <div className="rounded-2xl sm:rounded-3xl border border-[var(--border-hover)] bg-gradient-to-r from-emerald-950/70 via-[var(--surface)] to-teal-950/70 p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to upgrade your university class attendance?
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl mx-auto">
            Takes under 2 minutes to create your workspace, add semester subjects, and invite your class. Free for university CRs, faculty, and students.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3.5">
            <Link
              href="/signup"
              className="button-primary px-8 py-3 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-xl shadow-emerald-950/60"
            >
              <span>Create Your Class Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="button-secondary px-6 py-3 text-xs sm:text-sm font-semibold"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
