"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import type { ClassRecord } from "@/lib/domain";

export default function GooglePage() {
  const [classRecord, setClassRecord] = useState<ClassRecord | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => void (async () => { const response = await fetch("/api/dashboard", { headers: await authHeaders() }); const result = await readApiResponse(response); if (response.ok) setClassRecord(result.class as ClassRecord | null); })(), 0); return () => window.clearTimeout(timer); }, []);
  return <main className="app-page"><div className="app-page-header"><Link href="/dashboard" className="back-link">← Dashboard</Link><p className="eyebrow">Workspace integration</p><h1>Google Sheets</h1><p>Your attendance workbook and synchronization status.</p></div><section className="settings-card"><div className="connection-status"><span className="status-dot" /><span><strong>{classRecord?.spreadsheetId ? "Connected" : "Not connected"}</strong><small>{classRecord?.spreadsheetId ? "Attendance data syncs to your class workbook." : "Connect Google Sheets from the dashboard."}</small></span></div>{classRecord?.spreadsheetId && <a className="button-primary" target="_blank" rel="noreferrer" href={`https://docs.google.com/spreadsheets/d/${classRecord.spreadsheetId}`}>Open spreadsheet ↗</a>}<Link href="/dashboard" className="button-secondary">Back to dashboard</Link></section></main>;
}
