import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { karachiDate } from "@/lib/domain";

async function context(request: Request) {
  const user = await authenticated(request); if (!user) return null;
  const body = await request.json().catch(() => ({}));
  return { user, body, db: getAdminDb() };
}
export async function GET(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const url = new URL(request.url); 
  const rawClassId = url.searchParams.get("classId"); 
  const subjectId = url.searchParams.get("subjectId"); 
  const date = url.searchParams.get("date"); 
  const allDates = url.searchParams.get("all") === "true";
  const db = getAdminDb();

  let classId = rawClassId;
  if (!classId) {
    const memberships = await db.collection("memberships").where("uid", "==", user.uid).where("status", "==", "approved").limit(1).get();
    if (!memberships.empty) {
      classId = String(memberships.docs[0].data().classId);
    }
  }
  if (!classId) return NextResponse.json({ error: "classId is required." }, { status: 400 });

  const membership = await db.collection("memberships").doc(`${classId}_${user.uid}`).get();
  const cls = await db.collection("classes").doc(classId).get();
  if ((!membership.exists || membership.data()?.status !== "approved") && cls.data()?.crUid !== user.uid) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // If user is a student: return ONLY their personal attendance records
  if (membership.data()?.role === "student") {
    let query = db.collection("attendance").where("classId", "==", classId).where("studentUid", "==", user.uid);
    if (subjectId) {
      query = query.where("subjectId", "==", subjectId);
    }
    if (date && !allDates) {
      query = query.where("date", "==", date);
    }

    const [snap, subjectsSnap] = await Promise.all([
      query.get(),
      db.collection("subjects").where("classId", "==", classId).get(),
    ]);

    const activeSubjects = subjectsSnap.docs.filter((s) => s.data().active !== false);
    const subjectMap = Object.fromEntries(subjectsSnap.docs.map((s) => [s.id, { id: s.id, name: s.data().name }]));

    const attendanceRecords = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        date: String(data.date),
        subjectId: String(data.subjectId),
        subjectName: subjectMap[String(data.subjectId)]?.name ?? "Subject",
        present: Boolean(data.present),
      };
    });

    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((r) => r.present).length;
    const absent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 100;

    return NextResponse.json({
      isStudent: true,
      attendance: attendanceRecords,
      subjects: activeSubjects.map((s) => ({ id: s.id, name: s.data().name })),
      summary: { total, present, absent, percentage },
      student: {
        uid: user.uid,
        fullName: membership.data()?.fullName ?? user.displayName ?? "Student",
        seatNumber: membership.data()?.seatNumber ?? "",
      },
      class: cls.data(),
      canManage: false,
      canEdit: false,
    });
  }

  // Teacher or CR flow:
  if (!subjectId) return NextResponse.json({ error: "subjectId is required." }, { status: 400 });
  let query = db.collection("attendance").where("classId", "==", classId).where("subjectId", "==", subjectId);
  if (date && !allDates) query = query.where("date", "==", date) as typeof query;
  const snap = await query.get();
  const students = await db.collection("memberships").where("classId", "==", classId).where("role", "==", "student").where("status", "==", "approved").get();
  const subjectData = (await db.collection("subjects").doc(subjectId).get()).data() ?? {};
  const isManager = cls.data()?.crUid === user.uid || (membership.data()?.role === "teacher" && subjectData.teacherUid === user.uid);
  const selectedDateRecords = date ? snap.docs.filter((item) => item.data().date === date) : [];
  const canEditDate = date !== null && (date === karachiDate() || (date < karachiDate() && selectedDateRecords.length === 0));
  return NextResponse.json({ 
    attendance: snap.docs.map((d) => ({ id: d.id, ...d.data() })), 
    students: students.docs.map((d) => ({ uid: d.data().uid, fullName: d.data().fullName, fatherName: d.data().fatherName, seatNumber: d.data().seatNumber })), 
    subject: { id: subjectId, name: subjectData.name }, 
    class: cls.data(), 
    canManage: isManager, 
    canEdit: isManager && canEditDate, 
    dateLocked: isManager && !canEditDate 
  });
}
export async function POST(request: Request) {
  const result = await context(request); if (!result) return unauthorized();
  const { user, body, db } = result; const { classId, subjectId, date, records } = body;
  if (!classId || !subjectId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(records)) return NextResponse.json({ error: "Invalid attendance payload." }, { status: 400 });
  const cls = await db.collection("classes").doc(classId).get(); const subject = await db.collection("subjects").doc(subjectId).get();
  const member = await db.collection("memberships").doc(`${classId}_${user.uid}`).get();
  if (cls.data()?.crUid !== user.uid && (!member.exists || member.data()?.role !== "teacher" || subject.data()?.teacherUid !== user.uid)) return NextResponse.json({ error: "Only the assigned teacher can mark attendance." }, { status: 403 });
  if (date > karachiDate()) return NextResponse.json({ error: "Attendance cannot be marked for a future date." }, { status: 409 });
  const existingDate = await db.collection("attendance").where("classId", "==", classId).where("subjectId", "==", subjectId).where("date", "==", date).limit(1).get();
  if (existingDate.size > 0 && date < karachiDate()) return NextResponse.json({ error: "This historical attendance is permanently locked." }, { status: 409 });
  const batch = db.batch();
  for (const item of records) {
    if (typeof item?.studentUid !== "string" || typeof item?.present !== "boolean") continue;
    batch.set(db.collection("attendance").doc(`${classId}_${subjectId}_${date}_${item.studentUid}`), { classId, subjectId, date, studentUid: item.studentUid, present: item.present, markedBy: user.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }

  await batch.commit();
  if (cls.data()?.spreadsheetId) {
    try {
      const { syncAttendanceMatrix } = await import("@/lib/google");
      const [members, attendance] = await Promise.all([
        db.collection("memberships").where("classId", "==", classId).limit(500).get(),
        db.collection("attendance").where("classId", "==", classId).where("subjectId", "==", subjectId).limit(5000).get(),
      ]);
      const dates = [...new Set(attendance.docs.map((item) => String(item.data().date)))].sort();
      const values = [
        [`${cls.data()?.university ?? ""} · ${cls.data()?.department ?? ""} · ${cls.data()?.className ?? ""} · Section ${cls.data()?.section ?? ""} · ${cls.data()?.semester ?? ""}`],
        ["Seat number", "Student name", "Father name", ...dates, "Total"],
        ...members.docs.filter((item) => item.data().role === "student" && item.data().status === "approved").sort((a, b) => String(a.data().seatNumber ?? "").localeCompare(String(b.data().seatNumber ?? ""))).map((item) => {
          const student = item.data();
          const studentRows = attendance.docs.filter((record) => record.data().studentUid === student.uid);
          const statuses = dates.map((day) => studentRows.find((record) => record.data().date === day)?.data().present === true ? "Present" : studentRows.some((record) => record.data().date === day) ? "Absent" : "");
          return [String(student.seatNumber ?? ""), String(student.fullName ?? ""), String(student.fatherName ?? ""), ...statuses, `${statuses.filter((status) => status === "Present").length}/${statuses.filter(Boolean).length}`];
        }),
      ];
      await syncAttendanceMatrix(cls.data()!.crUid, cls.data()!.spreadsheetId, subject.data()?.name ?? "Attendance", values);
    } catch (error) { console.error("Attendance sheet sync failed", error); }
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
  const db = getAdminDb();
  const cls = await db.collection("classes").doc(classId).get();
  const subject = await db.collection("subjects").doc(subjectId).get();
  if (!cls.exists || !subject.exists || subject.data()?.classId !== classId) return NextResponse.json({ error: "Attendance context not found." }, { status: 404 });
  const member = await db.collection("memberships").doc(`${classId}_${user.uid}`).get();
  const allowed = cls.data()?.crUid === user.uid || (member.data()?.role === "teacher" && member.data()?.status === "approved" && subject.data()?.teacherUid === user.uid);
  if (!allowed) return NextResponse.json({ error: "Only the CR or assigned teacher can delete attendance." }, { status: 403 });
  const records = await db.collection("attendance").where("classId", "==", classId).where("subjectId", "==", subjectId).where("date", "==", date).get();
  if (records.empty) return NextResponse.json({ error: "No attendance records exist for this date." }, { status: 404 });
  const batch = db.batch();
  records.docs.forEach((record) => batch.delete(record.ref));
  await batch.commit();
  if (cls.data()?.spreadsheetId) {
    try {
      const { syncAttendanceMatrix } = await import("@/lib/google");
      const [members, attendance] = await Promise.all([
        db.collection("memberships").where("classId", "==", classId).limit(500).get(),
        db.collection("attendance").where("classId", "==", classId).where("subjectId", "==", subjectId).limit(5000).get(),
      ]);
      const dates = [...new Set(attendance.docs.map((item) => String(item.data().date)))].sort();
      const values = [
        [`${cls.data()?.university ?? ""} · ${cls.data()?.department ?? ""} · ${cls.data()?.className ?? ""} · Section ${cls.data()?.section ?? ""} · ${cls.data()?.semester ?? ""}`],
        ["Seat number", "Student name", "Father name", ...dates, "Total"],
        ...members.docs.filter((item) => item.data().role === "student" && item.data().status === "approved").sort((a, b) => String(a.data().seatNumber ?? "").localeCompare(String(b.data().seatNumber ?? ""))).map((item) => {
          const student = item.data();
          const rows = attendance.docs.filter((record) => record.data().studentUid === student.uid);
          const statuses = dates.map((day) => rows.find((record) => record.data().date === day)?.data().present === true ? "Present" : rows.some((record) => record.data().date === day) ? "Absent" : "");
          return [String(student.seatNumber ?? ""), String(student.fullName ?? ""), String(student.fatherName ?? ""), ...statuses, `${statuses.filter((status) => status === "Present").length}/${statuses.filter(Boolean).length}`];
        }),
      ];
      await syncAttendanceMatrix(cls.data()!.crUid, cls.data()!.spreadsheetId, subject.data()?.name ?? "Attendance", values);
    } catch (error) { console.error("Attendance sheet delete sync failed", error); }
  }
  return NextResponse.json({ ok: true, deleted: records.size });
}
