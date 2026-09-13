import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { syncAttendanceTab } from "@/lib/google";
export async function POST(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const { classId, subjectId, date } = await request.json().catch(() => ({}));
  const db = getAdminDb(); const cls = await db.collection("classes").doc(classId).get(); const subject = await db.collection("subjects").doc(subjectId).get();
  if (!cls.exists || cls.data()?.crUid !== user.uid || subject.data()?.classId !== classId) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const spreadsheetId = cls.data()?.spreadsheetId; if (!spreadsheetId) return NextResponse.json({ error: "Connect a Google Sheet first." }, { status: 409 });
  const records = await db.collection("attendance").where("classId", "==", classId).where("subjectId", "==", subjectId).where("date", "==", date).get();
  const values = [["Student", "Date", "Status"], ...records.docs.map((d) => { const x = d.data(); return [x.studentUid, x.date, x.present ? "Present" : "Absent"]; })];
  await syncAttendanceTab(user.uid, spreadsheetId, subject.data()?.name ?? "Attendance", values);
  return NextResponse.json({ ok: true, count: records.size });
}
