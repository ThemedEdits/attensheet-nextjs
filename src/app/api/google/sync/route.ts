import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { syncAttendanceMatrix } from "@/lib/google";
export async function POST(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const { classId, subjectId } = await request.json().catch(() => ({}));
  const db = getAdminDb(); const cls = await db.collection("classes").doc(classId).get(); const subject = await db.collection("subjects").doc(subjectId).get();
  if (!cls.exists || cls.data()?.crUid !== user.uid || subject.data()?.classId !== classId) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const spreadsheetId = cls.data()?.spreadsheetId; if (!spreadsheetId) return NextResponse.json({ error: "Connect a Google Sheet first." }, { status: 409 });
  const [members, attendance] = await Promise.all([
    db.collection("memberships").where("classId", "==", classId).limit(500).get(),
    db.collection("attendance").where("classId", "==", classId).where("subjectId", "==", subjectId).limit(5000).get(),
  ]);
  const dates = [...new Set(attendance.docs.map((d) => String(d.data().date)))].sort();
  const byStudent = new Map<string, Record<string, unknown>>();
  attendance.docs.forEach((d) => { const data = d.data(); byStudent.set(`${data.studentUid}_${data.date}`, data); });
  const classData = cls.data() ?? {};
  const values = [
    [`${classData.university ?? ""} · ${classData.department ?? ""} · ${classData.className ?? ""} · Section ${classData.section ?? ""} · ${classData.semester ?? ""}`],
    ["Seat number", "Student name", "Father name", ...dates, "Total"],
    ...members.docs.filter((d) => d.data().role === "student" && d.data().status === "approved").sort((a, b) => String(a.data().seatNumber ?? "").localeCompare(String(b.data().seatNumber ?? ""))).map((d) => {
      const student = d.data();
      const statuses = dates.map((date) => byStudent.get(`${student.uid}_${date}`)?.present ? "Present" : byStudent.has(`${student.uid}_${date}`) ? "Absent" : "");
      return [String(student.seatNumber ?? ""), String(student.fullName ?? ""), String(student.fatherName ?? ""), ...statuses, `${statuses.filter((status) => status === "Present").length}/${statuses.filter(Boolean).length}`];
    }),
  ];
  await syncAttendanceMatrix(user.uid, spreadsheetId, subject.data()?.name ?? "Attendance", values);
  return NextResponse.json({ ok: true, count: attendance.size, dates: dates.length });
}
