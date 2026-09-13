import Link from "next/link";

const highlights = [
  ["01", "Attendance, without the spreadsheet busywork", "Teachers mark attendance in seconds. Attensheet keeps the Google Sheet updated in the background."],
  ["02", "Built around your class", "CRs set up the class once, invite teachers and students, and keep every subject organized."],
  ["03", "Secure by design", "Role-based access, server-side checks, and immutable attendance history keep records trustworthy."],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400 text-lg font-black text-slate-950">A</span>
          <span className="text-lg text-white">attensheet<span className="text-emerald-400">.</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">Sign in</Link>
          <Link href="/signup" className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300">Get started</Link>
        </div>
      </nav>

      <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 lg:px-8 lg:pt-28">
        <div className="pointer-events-none absolute -right-40 -top-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Attendance, finally in one place
          </div>
          <h1 className="text-5xl font-semibold tracking-[-0.04em] text-white sm:text-7xl">
            Your class.<br /><span className="text-emerald-400">One clear record.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
            Attensheet makes university attendance simple for class representatives, teachers, and students — while Google Sheets quietly keeps the record safe.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300">Create your class <span className="ml-2">→</span></Link>
            <Link href="/login" className="rounded-xl border border-white/10 px-5 py-3 font-medium text-white transition hover:border-white/20 hover:bg-white/5">Sign in</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-24 lg:grid-cols-3 lg:px-8">
        {highlights.map(([number, title, body]) => (
          <div key={number} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <span className="text-xs font-semibold text-emerald-400">{number}</span>
            <h2 className="mt-8 text-xl font-semibold text-white">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
