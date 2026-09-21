import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { syncAttendanceMatrix } from "@/lib/google";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const { classId, subjectId } = await request.json().catch(() => ({}));
  
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  
  if (!cls || cls.crUid !== user.uid || subject?.classId !== classId) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const spreadsheetId = cls.spreadsheetId; if (!spreadsheetId) return NextResponse.json({ error: "Connect a Google Sheet first." }, { status: 409 });
  
  const [members, attendance] = await Promise.all([
    prisma.membership.findMany({ where: { classId, role: "student", status: "approved" } }),
    prisma.attendance.findMany({ where: { classId, subjectId } }),
  ]);
  
  const dates = [...new Set(attendance.map((d) => String(d.date)))].sort();
  const byStudent = new Map<string, Record<string, unknown>>();
  attendance.forEach((d) => { byStudent.set(`${d.studentUid}_${d.date}`, d as unknown as Record<string, unknown>); });
  
  const classData = cls;
  const values = [
    [`${classData.university ?? ""} · ${classData.department ?? ""} · ${classData.className ?? ""} · Section ${classData.section ?? ""} · ${classData.semester ?? ""}`],
    ["Seat number", "Student name", "Father name", ...dates, "Total"],
    ...members.sort((a, b) => String(a.seatNumber ?? "").localeCompare(String(b.seatNumber ?? ""))).map((student) => {
      const statuses = dates.map((date) => (byStudent.get(`${student.uid}_${date}`) as any)?.present ? "1" : byStudent.has(`${student.uid}_${date}`) ? "0" : "");
      return [String(student.seatNumber ?? ""), String(student.fullName ?? ""), String(student.fatherName ?? ""), ...statuses, `${statuses.filter((status) => status === "1").length}/${statuses.filter(Boolean).length}`];
    }),
  ];
  await syncAttendanceMatrix(user.uid, spreadsheetId, subject?.name ?? "Attendance", values);
  return NextResponse.json({ ok: true, count: attendance.length, dates: dates.length });
}
