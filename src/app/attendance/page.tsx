"use client";
import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { karachiDate } from "@/lib/domain";
export default function AttendancePage() {
  const [rows] = useState<{ studentUid: string; present: boolean }[]>([]); const message = "Choose a class and subject from your dashboard to mark attendance.";
  const [date, setDate] = useState(karachiDate());
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-12"><p className="text-sm text-emerald-400">Attendance · Asia/Karachi</p><h1 className="mt-2 text-4xl font-semibold text-white">Daily register</h1><label className="mt-8 block max-w-xs text-sm text-slate-300">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" /></label><p className="mt-6 text-sm text-slate-400">{message}</p>{rows.length > 0 && <button className="button-primary mt-6" onClick={async () => { const user = firebaseAuth.currentUser; if (!user) return; await fetch("/api/attendance", { method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ date, records: rows }) }); }}>Save attendance</button>}</main>;
}
