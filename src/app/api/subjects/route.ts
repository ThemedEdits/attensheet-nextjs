import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { addStudentToAttendanceTabs, createAttendanceTab, deleteAttendanceTab, removeDefaultBlankTabs, renameAttendanceTab } from "@/lib/google";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const classId = new URL(request.url).searchParams.get("classId"); if (!classId) return NextResponse.json({ error: "classId is required." }, { status: 400 });
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  const member = await prisma.membership.findUnique({ where: { id: `${classId}_${user.uid}` } });
  if (cls?.crUid !== user.uid && (!member || member.status !== "approved")) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  
  let subjectsQuery: any = { classId, active: true };
  if (cls?.crUid !== user.uid && member?.role === "teacher") {
    subjectsQuery.teacherUid = user.uid;
  }
  
  const subjectDocs = await prisma.subject.findMany({ where: subjectsQuery });
  
  const subjects = await Promise.all(subjectDocs.map(async (data) => {
    const teacher = data.teacherUid ? await prisma.user.findUnique({ where: { uid: data.teacherUid } }) : null;
    return { ...data, teacherName: teacher?.displayName ?? null };
  }));
  return NextResponse.json({ subjects });
}

export async function POST(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const { classId, name } = await request.json().catch(() => ({}));
  if (!classId || typeof name !== "string" || name.trim().length < 2) return NextResponse.json({ error: "A subject name is required." }, { status: 400 });
  
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (cls?.crUid !== user.uid) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  
  const newSubjectId = uuidv4();
  const subject = await prisma.subject.create({
    data: { id: newSubjectId, classId, name: name.trim(), active: true },
  });
  
  if (cls.spreadsheetId) {
    try {
      const tabId = await createAttendanceTab(user.uid, cls.spreadsheetId, name.trim(), [[`${cls.university ?? ""} · ${cls.department ?? ""} · ${cls.className ?? ""} · Section ${cls.section ?? ""} · ${cls.semester ?? ""}`], ["Seat number", "Student name", "Father name", "Total"]]);
      await removeDefaultBlankTabs(user.uid, cls.spreadsheetId);
      
      await prisma.subject.update({
        where: { id: newSubjectId },
        data: { googleSheetTabId: String(tabId) },
      });
      
      const students = await prisma.membership.findMany({ where: { classId, role: "student", status: "approved" }, take: 500 });
      await Promise.all(students.map((student) => addStudentToAttendanceTabs(user.uid, cls.spreadsheetId!, [name.trim()], { uid: student.uid, fullName: student.fullName ?? undefined, fatherName: student.fatherName ?? undefined, seatNumber: student.seatNumber ?? undefined })));
    } catch (error) { console.error("Subject sheet tab creation failed", error); }
  }
  return NextResponse.json({ id: subject.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const { subjectId, active, teacherUid, name } = await request.json().catch(() => ({}));
  if (!subjectId || (typeof active !== "boolean" && typeof teacherUid !== "string" && teacherUid !== null && typeof name !== "string")) return NextResponse.json({ error: "Invalid subject update." }, { status: 400 });
  
  const snap = await prisma.subject.findUnique({ where: { id: subjectId } }); if (!snap) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  const cls = await prisma.class.findUnique({ where: { id: snap.classId } });
  
  if (cls?.crUid !== user.uid && snap.teacherUid !== user.uid) return NextResponse.json({ error: "Only the class representative or assigned teacher can edit this subject." }, { status: 403 });
  
  const updates: Record<string, any> = {};
  if (typeof name === "string") {
    if (name.trim().length < 2) return NextResponse.json({ error: "Subject name is too short." }, { status: 400 });
    updates.name = name.trim();
  }
  if (typeof active === "boolean") updates.active = active;
  if (typeof teacherUid === "string" || teacherUid === null) {
    if (cls?.crUid !== user.uid) return NextResponse.json({ error: "Only the class representative can assign a teacher." }, { status: 403 });
    if (teacherUid) { 
      const member = await prisma.membership.findUnique({ where: { id: `${snap.classId}_${teacherUid}` } });
      if (!member || member.role !== "teacher" || member.status !== "approved") return NextResponse.json({ error: "Teacher must be approved first." }, { status: 400 }); 
    }
    updates.teacherUid = teacherUid;
  }
  await prisma.subject.update({ where: { id: subjectId }, data: updates });
  
  if (typeof name === "string" && snap.googleSheetTabId && cls?.spreadsheetId) {
    try { await renameAttendanceTab(user.uid, cls.spreadsheetId, Number(snap.googleSheetTabId), name.trim()); } catch (error) { console.error("Subject tab rename failed", error); }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const subjectId = new URL(request.url).searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ error: "Subject ID is required." }, { status: 400 });
  
  const snap = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!snap) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  
  const cls = await prisma.class.findUnique({ where: { id: snap.classId } });
  if (cls?.crUid !== user.uid && snap.teacherUid !== user.uid) return NextResponse.json({ error: "Only the class representative or assigned teacher can delete this subject." }, { status: 403 });
  
  if (cls?.spreadsheetId && snap.googleSheetTabId) {
    try { await deleteAttendanceTab(user.uid, cls.spreadsheetId, Number(snap.googleSheetTabId)); } catch (error) { console.error("Subject tab delete failed", error); }
  }
  
  await prisma.subject.delete({ where: { id: subjectId } });
  return NextResponse.json({ ok: true });
}
