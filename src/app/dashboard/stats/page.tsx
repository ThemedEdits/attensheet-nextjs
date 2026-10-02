"use client";

import { useEffect, useState } from "react";
import { readApiResponse } from "@/lib/client-response";
import { authHeaders } from "@/lib/client-auth";
import { useToast } from "@/components/ToastProvider";
import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { CustomSelect } from "@/components/CustomSelect";

type StatRecord = { present: number; absent: number };
type StatsData = {
  overall: {
    dayOfWeek: Record<string, StatRecord>;
    subjects: Record<string, StatRecord>;
    weeks: Record<string, StatRecord>;
  };
  studentStats: Record<string, {
    dayOfWeek: Record<string, StatRecord>;
    subjects: Record<string, StatRecord>;
    weeks: Record<string, StatRecord>;
    totalPresent: number;
    totalAbsent: number;
  }>;
  members: { uid: string; name: string; role: string; seatNumber: string | null }[];
  effectiveRole: string;
  currentUserUid: string;
};

const BarGraph = ({ data, title }: { data: { label: string; present: number; absent: number }[], title: string }) => {
  const maxVal = Math.max(...data.map(d => d.present + d.absent), 1);
  return (
    <div className="card p-5 border border-[var(--border)] rounded-2xl bg-[var(--surface-elevated)]">
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      <div className="flex flex-col gap-4">
        {data.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No data available.</p>
        ) : (
          data.map(d => {
            const total = d.present + d.absent;
            const pPct = total === 0 ? 0 : (d.present / maxVal) * 100;
            const aPct = total === 0 ? 0 : (d.absent / maxVal) * 100;
            return (
              <div key={d.label} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                  <span className="font-medium">{d.label}</span>
                  <span>{d.present} P / {d.absent} A</span>
                </div>
                <div className="flex h-3 w-full bg-[var(--surface-hover)] rounded-full overflow-hidden">
                  <div style={{ width: `${pPct}%` }} className="bg-emerald-500 h-full" title={`Present: ${d.present}`} />
                  <div style={{ width: `${aPct}%` }} className="bg-rose-500 h-full" title={`Absent: ${d.absent}`} />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
};

export default function AdvancedStatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUid, setSelectedUid] = useState<string>("overall");
  const toast = useToast();

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/stats", { headers: await authHeaders() });
        const result = await readApiResponse(res);
        if (!res.ok) throw new Error(String(result.error ?? "Failed to fetch stats."));
        setData(result as StatsData);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Error fetching stats", "error");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [toast]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-6 py-1">
            <div className="h-2 bg-slate-700 rounded"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-2 bg-slate-700 rounded col-span-2"></div>
                <div className="h-2 bg-slate-700 rounded col-span-1"></div>
              </div>
              <div className="h-2 bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const isStudent = data.effectiveRole === "student";

  const renderStats = (source: { dayOfWeek: Record<string, StatRecord>; subjects: Record<string, StatRecord>; weeks: Record<string, StatRecord> }) => {
    const daysData = Object.entries(source.dayOfWeek)
      .map(([label, stats]) => ({ label, ...stats }))
      .sort((a, b) => (b.present + b.absent) - (a.present + a.absent));
    
    const subjectsData = Object.entries(source.subjects)
      .map(([label, stats]) => ({ label, ...stats }))
      .sort((a, b) => b.present - a.present);
    
    const weeksData = Object.entries(source.weeks)
      .map(([label, stats]) => ({ label, ...stats }))
      .sort((a, b) => b.label.localeCompare(a.label)); // Sort weeks chronologically

    const mostPresentsDay = daysData.length > 0 ? daysData.reduce((prev, current) => (prev.present > current.present) ? prev : current) : null;
    const mostAbsentsDay = daysData.length > 0 ? daysData.reduce((prev, current) => (prev.absent > current.absent) ? prev : current) : null;
    const mostAttendedWeek = weeksData.length > 0 ? weeksData.reduce((prev, current) => (prev.present > current.present) ? prev : current) : null;

    return (
      <div className="mt-8 flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5 border border-[var(--border)] bg-[var(--surface-elevated)] flex flex-col items-center justify-center text-center">
            <span className="text-xs text-[var(--text-secondary)] mb-1">Most Presents Day</span>
            <span className="text-2xl font-bold text-emerald-400">{mostPresentsDay ? mostPresentsDay.label : "N/A"}</span>
            <span className="text-[10px] text-[var(--text-muted)] mt-1">{mostPresentsDay ? `${mostPresentsDay.present} Presents` : ""}</span>
          </div>
          <div className="card p-5 border border-[var(--border)] bg-[var(--surface-elevated)] flex flex-col items-center justify-center text-center">
            <span className="text-xs text-[var(--text-secondary)] mb-1">Most Absents Day</span>
            <span className="text-2xl font-bold text-rose-400">{mostAbsentsDay ? mostAbsentsDay.label : "N/A"}</span>
            <span className="text-[10px] text-[var(--text-muted)] mt-1">{mostAbsentsDay ? `${mostAbsentsDay.absent} Absents` : ""}</span>
          </div>
          <div className="card p-5 border border-[var(--border)] bg-[var(--surface-elevated)] flex flex-col items-center justify-center text-center">
            <span className="text-xs text-[var(--text-secondary)] mb-1">Highest Attendance Week</span>
            <span className="text-2xl font-bold text-[var(--accent)]">{mostAttendedWeek ? mostAttendedWeek.label : "N/A"}</span>
            <span className="text-[10px] text-[var(--text-muted)] mt-1">{mostAttendedWeek ? `${mostAttendedWeek.present} Presents` : ""}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BarGraph data={daysData} title="Attendance by Day of Week" />
          <BarGraph data={subjectsData} title="Attendance by Subject" />
          <div className="md:col-span-2">
            <BarGraph data={weeksData} title="Attendance by Week" />
          </div>
        </div>
      </div>
    );
  };

  const studentOptions = [
    { value: "overall", label: "Overall Class Stats" },
    ...data.members
      .filter(m => m.role === "student")
      .map(m => ({ value: m.uid, label: `${m.name} ${m.seatNumber ? `(${m.seatNumber})` : ''}` }))
  ];

  const uidToView = isStudent ? data.currentUserUid : selectedUid;
  const statsToView = uidToView === "overall" ? data.overall : (data.studentStats[uidToView] || { dayOfWeek: {}, subjects: {}, weeks: {} });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
              <BarChart3 className="h-8 w-8 text-[var(--accent)]" />
              Advanced Statistics
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {isStudent ? "Dive deeper into your attendance patterns." : "Analyze class and individual student performance."}
            </p>
          </div>
          {!isStudent && (
            <div className="w-full sm:w-64">
              <CustomSelect
                options={studentOptions}
                value={selectedUid}
                onChange={setSelectedUid}
                placeholder="Select Student"
              />
            </div>
          )}
        </div>
      </div>

      {renderStats(statsToView)}
    </main>
  );
}
