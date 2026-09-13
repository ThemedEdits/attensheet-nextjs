import Link from "next/link";
import { 
  ArrowRight, 
  CheckCircle2, 
  FileSpreadsheet, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  GraduationCap, 
  Clock 
} from "lucide-react";

const highlights = [
  {
    step: "01",
    icon: Clock,
    title: "Attendance without the spreadsheet busywork",
    body: "Teachers mark daily attendance in seconds on any device. AttenSheet synchronizes directly to your Google Sheet in the background.",
  },
  {
    step: "02",
    icon: Users,
    title: "Built around your university class",
    body: "Class representatives set up the class workspace once, approve join requests, assign teachers to subjects, and keep rosters organized.",
  },
  {
    step: "03",
    icon: ShieldCheck,
    title: "Secure and verifiable by design",
    body: "Role-based access, server-side identity validation, and immutable attendance history keep university records trustworthy and tamper-proof.",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Background Radial Glows */}
      <div className="pointer-events-none absolute left-1/2 -top-40 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-[400px] w-[500px] rounded-full bg-emerald-600/5 blur-[100px]" />

      {/* Top Navbar */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5 font-bold tracking-tight">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary)] text-sm font-black text-[#07110D] shadow-[0_0_16px_rgba(22,166,106,0.35)] transition group-hover:shadow-[0_0_24px_rgba(53,217,138,0.5)]">
            A
          </div>
          <span className="text-lg text-white">
            Atten<span className="text-[var(--accent)]">Sheet</span>
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="button-primary text-xs sm:text-sm"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Hero Text */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-hover)] bg-[var(--accent-soft)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent)]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Version 1.0 · University Ready</span>
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-[1.1]">
              Your university class.<br />
              <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--primary-hover)] bg-clip-text text-transparent">
                One clear record.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
              AttenSheet eliminates manual paperwork for class representatives, teachers, and students. Mark daily attendance with rapid roll-call while Google Sheets quietly keeps the master ledger safe.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5 sm:gap-4">
              <Link
                href="/signup"
                className="button-primary px-6 py-3 text-sm shadow-xl shadow-emerald-950/40"
              >
                <span>Create your class</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="button-secondary px-6 py-3 text-sm"
              >
                Sign in to workspace
              </Link>
            </div>

            {/* Quick Proof Points */}
            <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                <span>Zero spreadsheet corruption</span>
              </div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-[var(--accent)]" />
                <span>Live 2-way Google Sync</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-[var(--accent)]" />
                <span>Role-based permissions</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Teaser Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] animate-pulse" />
                  <span className="text-xs font-semibold text-white">Live Attendance Register</span>
                </div>
                <span className="badge-present text-[11px]">Sync Active</span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-[var(--bg-secondary)] p-3 border border-[var(--border)]">
                  <div>
                    <p className="text-xs font-medium text-white">Software Engineering</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Prof. Tariq · BSCS 6th</p>
                  </div>
                  <span className="text-xs font-bold text-[var(--accent)]">46 / 48 Present</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[var(--bg-secondary)] p-3 border border-[var(--border)]">
                  <div>
                    <p className="text-xs font-medium text-white">Computer Networks</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Dr. Farhan · BSCS 6th</p>
                  </div>
                  <span className="text-xs font-bold text-[var(--accent)]">44 / 48 Present</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[var(--bg-secondary)] p-3 border border-[var(--border)]">
                  <div>
                    <p className="text-xs font-medium text-white">Cloud Computing</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Awaiting roll-call</p>
                  </div>
                  <span className="badge-neutral text-[10px]">Upcoming</span>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-[var(--border-hover)] bg-[var(--accent-soft)] p-3 text-center">
                <p className="text-xs font-medium text-[var(--accent)]">
                  Google Sheet auto-updated at Asia/Karachi
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="relative mx-auto max-w-7xl px-6 pb-24 sm:pb-32 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="card card-hover p-6 sm:p-7 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] border border-[var(--border-hover)] text-[var(--accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold tracking-widest text-[var(--accent)]">
                    {item.step}
                  </span>
                </div>
                <h2 className="mt-6 text-lg font-bold text-white leading-snug">
                  {item.title}
                </h2>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

