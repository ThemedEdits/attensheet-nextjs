import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { karachiDate } from "@/lib/domain";

export async function GET(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const url = new URL(request.url); 
  const rawClassId = url.searchParams.get("classId"); 
  const subjectId = url.searchParams.get("subjectId"); 
  const date = url.searchParams.get("date"); 
  const allDates = url.searchParams.get("all") === "true";

  let classId = rawClassId;
  if (!classId) {
    const memberships = await prisma.membership.findMany({
      where: { uid: user.uid, status: "approved" },
      take: 1
    });
    if (memberships.length > 0) {
      classId = memberships[0].classId;
    }
  }
  if (!classId) return NextResponse.json({ error: "classId is required." }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { classId_uid: { classId, uid: user.uid } }
  });
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  if ((!membership || membership.status !== "approved") && cls.crUid !== user.uid) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const isPrimaryCr = cls.crUid === user.uid;
  const isTeacher = membership?.role === "teacher" && membership?.status === "approved";
  const isSecondaryCr = !isPrimaryCr && (membership?.isSecondaryCr === true || cls.secondaryCrUid === user.uid);
  const isRegularStudent = membership?.role === "student" && !isPrimaryCr && !isSecondaryCr;

  if (isRegularStudent) {
    const whereClause: any = { classId, studentUid: user.uid };
    if (subjectId) whereClause.subjectId = subjectId;
    if (date && !allDates) whereClause.date = date;

    const [attendanceRecordsDb, activeSubjects] = await Promise.all([
      prisma.attendance.findMany({ where: whereClause }),
      prisma.subject.findMany({ where: { classId, active: true } })
    ]);

    const subjectMap: Record<string, {name: string}> = Object.fromEntries(activeSubjects.map((s) => [s.id, {name: s.name}]));

    const attendanceRecords = attendanceRecordsDb.map((d) => ({
      id: d.id,
      date: d.date,
      subjectId: d.subjectId,
      subjectName: subjectMap[d.subjectId]?.name ?? "Subject",
      present: d.present,
    }));

    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((r) => r.present).length;
    const absent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 100;

    return NextResponse.json({
      isStudent: true,
      attendance: attendanceRecords,
      subjects: activeSubjects.map((s) => ({ id: s.id, name: s.name })),
      summary: { total, present, absent, percentage },
      student: {
        uid: user.uid,
        fullName: membership?.fullName ?? user.displayName ?? "Student",
        seatNumber: membership?.seatNumber ?? "",
      },
      class: cls,
      canManage: false,
      canEdit: false,
    });
  }

  if (!subjectId) return NextResponse.json({ error: "subjectId is required." }, { status: 400 });
  const whereClause: any = { classId, subjectId };
  if (date && !allDates) whereClause.date = date;
  
  const snap = await prisma.attendance.findMany({ where: whereClause });
  const students = await prisma.membership.findMany({ where: { classId, role: "student", status: "approved" } });
  const subjectData = await prisma.subject.findUnique({ where: { id: subjectId } }) || {} as any;
  
  const isManager = isPrimaryCr || (isTeacher && subjectData.teacherUid === user.uid);
  const canTakeAttendance = isPrimaryCr || (isTeacher && subjectData.teacherUid === user.uid) || isSecondaryCr;
  const selectedDateRecords = date ? snap.filter((item) => item.date === date) : [];
  const canEditDate = date !== null && (date === karachiDate() || (date < karachiDate() && selectedDateRecords.length === 0));
  
  return NextResponse.json({ 
    attendance: snap, 
    students: students.map((d) => ({ uid: d.uid, fullName: d.fullName, fatherName: d.fatherName, seatNumber: d.seatNumber })), 
    subject: { id: subjectId, name: subjectData.name, googleSheetTabId: subjectData.googleSheetTabId ?? null, teacherName: subjectData.teacherName ?? null }, 
    class: cls, 
    canManage: isManager, 
    canEdit: canTakeAttendance && canEditDate, 
    isSecondaryCr: Boolean(isSecondaryCr),
    dateLocked: canTakeAttendance && !canEditDate 
  });
}

export async function POST(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const { classId, subjectId, date, records } = body;
  
  if (!classId || !subjectId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(records)) return NextResponse.json({ error: "Invalid attendance payload." }, { status: 400 });
  
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  const member = await prisma.membership.findUnique({ where: { classId_uid: { classId, uid: user.uid } } });
  
  if (!cls || !subject) return NextResponse.json({ error: "Context not found" }, { status: 404 });
  
  const isPrimaryCr = cls.crUid === user.uid;
  const isTeacher = member?.role === "teacher" && subject.teacherUid === user.uid;
  const isSecondaryCr = !isPrimaryCr && (member?.isSecondaryCr === true || cls.secondaryCrUid === user.uid);
  if (!isPrimaryCr && !isTeacher && !isSecondaryCr) return NextResponse.json({ error: "Only the CR, assigned teacher, or 2nd CR can mark attendance." }, { status: 403 });
  if (date > karachiDate()) return NextResponse.json({ error: "Attendance cannot be marked for a future date." }, { status: 409 });
  
  const existingDate = await prisma.attendance.findFirst({ where: { classId, subjectId, date } });
  if (existingDate && date < karachiDate()) return NextResponse.json({ error: "This historical attendance is permanently locked." }, { status: 409 });
  
  const updates = records.map(item => {
    if (typeof item?.studentUid !== "string" || typeof item?.present !== "boolean") return null;
    const id = `${classId}_${subjectId}_${date}_${item.studentUid}`;
    return prisma.attendance.upsert({
      where: { classId_subjectId_date_studentUid: { classId, subjectId, date, studentUid: item.studentUid } },
      update: { present: item.present, markedBy: user.uid },
      create: { id, classId, subjectId, date, studentUid: item.studentUid, present: item.present, markedBy: user.uid }
    });
  }).filter(Boolean);
  
  await prisma.$transaction(updates as any);
  
  if (cls.spreadsheetId) {
    try {
      const { syncAttendanceMatrix } = await import("@/lib/google");
      const [members, attendance] = await Promise.all([
        prisma.membership.findMany({ where: { classId }, take: 500 }),
        prisma.attendance.findMany({ where: { classId, subjectId }, take: 20000 }),
      ]);
      const dates = [...new Set(attendance.map((item) => item.date))].sort();
      const values = [
        [`${cls.university ?? ""} · ${cls.department ?? ""} · ${cls.className ?? ""} · Section ${cls.section ?? ""} · ${cls.semester ?? ""}`],
        ["Seat number", "Student name", "Father name", ...dates, "Total"],
        ...members.filter((item) => item.role === "student" && item.status === "approved").sort((a, b) => String(a.seatNumber ?? "").localeCompare(String(b.seatNumber ?? ""))).map((student) => {
          const studentRows = attendance.filter((record) => record.studentUid === student.uid);
          const statuses = dates.map((day) => studentRows.find((record) => record.date === day)?.present === true ? "1" : studentRows.some((record) => record.date === day) ? "0" : "");
          return [String(student.seatNumber ?? ""), String(student.fullName ?? ""), String(student.fatherName ?? ""), ...statuses, `${statuses.filter((status) => status === "1").length}/${statuses.filter(Boolean).length}`];
        }),
      ];
      await syncAttendanceMatrix(cls.crUid, cls.spreadsheetId, subject.name ?? "Attendance", values, subject.googleSheetTabId ?? undefined);
    } catch (error: any) {
      console.error("Attendance sheet sync failed", error);
    }
  }
  return NextResponse.json({ ok: true, date, today: date === karachiDate() });
}

export async function DELETE(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const url = new URL(request.url);
  const classId = url.searchParams.get("classId");
  const subjectId = url.searchParams.get("subjectId");
  const date = url.searchParams.get("date");
  if (!classId || !subjectId || !date) return NextResponse.json({ error: "classId, subjectId, and date are required." }, { status: 400 });
  
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!cls || !subject || subject.classId !== classId) return NextResponse.json({ error: "Attendance context not found." }, { status: 404 });
  const member = await prisma.membership.findUnique({ where: { classId_uid: { classId, uid: user.uid } } });
  
  const allowed = cls.crUid === user.uid || (member?.role === "teacher" && member?.status === "approved" && subject.teacherUid === user.uid);
  if (!allowed) return NextResponse.json({ error: "Only the CR or assigned teacher can delete attendance." }, { status: 403 });
  
  const records = await prisma.attendance.findMany({ where: { classId, subjectId, date } });
  if (records.length === 0) return NextResponse.json({ error: "No attendance records exist for this date." }, { status: 404 });
  
  await prisma.attendance.deleteMany({ where: { classId, subjectId, date } });
  
  if (cls.spreadsheetId) {
    try {
      const { syncAttendanceMatrix } = await import("@/lib/google");
      const [members, attendance] = await Promise.all([
        prisma.membership.findMany({ where: { classId }, take: 500 }),
        prisma.attendance.findMany({ where: { classId, subjectId }, take: 20000 }),
      ]);
      const dates = [...new Set(attendance.map((item) => item.date))].sort();
      const values = [
        [`${cls.university ?? ""} · ${cls.department ?? ""} · ${cls.className ?? ""} · Section ${cls.section ?? ""} · ${cls.semester ?? ""}`],
        ["Seat number", "Student name", "Father name", ...dates, "Total"],
        ...members.filter((item) => item.role === "student" && item.status === "approved").sort((a, b) => String(a.seatNumber ?? "").localeCompare(String(b.seatNumber ?? ""))).map((student) => {
          const rows = attendance.filter((record) => record.studentUid === student.uid);
          const statuses = dates.map((day) => rows.find((record) => record.date === day)?.present === true ? "1" : rows.some((record) => record.date === day) ? "0" : "");
          return [String(student.seatNumber ?? ""), String(student.fullName ?? ""), String(student.fatherName ?? ""), ...statuses, `${statuses.filter((status) => status === "1").length}/${statuses.filter(Boolean).length}`];
        }),
      ];
      await syncAttendanceMatrix(cls.crUid, cls.spreadsheetId, subject.name ?? "Attendance", values, subject.googleSheetTabId ?? undefined);
    } catch (error: any) {
      console.error("Attendance sheet delete sync failed", error);
    }
  }
  return NextResponse.json({ ok: true, deleted: records.length });
}
