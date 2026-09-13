import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { addStudentToAttendanceTabs, createAttendanceTab, deleteAttendanceTab, removeDefaultBlankTabs, renameAttendanceTab } from "@/lib/google";
export async function GET(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const classId = new URL(request.url).searchParams.get("classId"); if (!classId) return NextResponse.json({ error: "classId is required." }, { status: 400 });
  const db = getAdminDb(); const cls = await db.collection("classes").doc(classId).get();
  const member = await db.collection("memberships").doc(`${classId}_${user.uid}`).get();
  if (cls.data()?.crUid !== user.uid && (!member.exists || member.data()?.status !== "approved")) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const snap = await db.collection("subjects").where("classId", "==", classId).get();
  const subjects = await Promise.all(snap.docs.filter((d) => d.data().active === true).map(async (d) => {
    const data = d.data();
    const teacher = data.teacherUid ? await db.collection("users").doc(String(data.teacherUid)).get() : null;
    return { id: d.id, ...data, teacherName: teacher?.data()?.name ?? null };
  }));
  return NextResponse.json({ subjects });
}
export async function POST(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const { classId, name } = await request.json().catch(() => ({}));
  if (!classId || typeof name !== "string" || name.trim().length < 2) return NextResponse.json({ error: "A subject name is required." }, { status: 400 });
  const db = getAdminDb(); const cls = await db.collection("classes").doc(classId).get();
  if (cls.data()?.crUid !== user.uid) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const ref = db.collection("subjects").doc(); await ref.set({ classId, name: name.trim(), active: true, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  const clsData = cls.data() ?? {};
  if (clsData.spreadsheetId) {
    try {
      const tabId = await createAttendanceTab(user.uid, clsData.spreadsheetId, name.trim(), [[`${clsData.university ?? ""} · ${clsData.department ?? ""} · ${clsData.className ?? ""} · Section ${clsData.section ?? ""} · ${clsData.semester ?? ""}`], ["Seat number", "Student name", "Father name", "Total"]]);
      await removeDefaultBlankTabs(user.uid, clsData.spreadsheetId);
      await ref.update({ googleSheetTabId: tabId ?? null });
      const students = await db.collection("memberships").where("classId", "==", classId).limit(500).get();
      await Promise.all(students.docs.filter((student) => student.data().role === "student" && student.data().status === "approved").map((student) => addStudentToAttendanceTabs(user.uid, clsData.spreadsheetId, [name.trim()], { uid: String(student.data().uid), fullName: student.data().fullName, fatherName: student.data().fatherName, seatNumber: student.data().seatNumber })));
    } catch (error) { console.error("Subject sheet tab creation failed", error); }
  }
  return NextResponse.json({ id: ref.id }, { status: 201 });
}
export async function PATCH(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const { subjectId, active, teacherUid, name } = await request.json().catch(() => ({}));
  if (!subjectId || (typeof active !== "boolean" && typeof teacherUid !== "string" && teacherUid !== null && typeof name !== "string")) return NextResponse.json({ error: "Invalid subject update." }, { status: 400 });
  const db = getAdminDb(); const ref = db.collection("subjects").doc(subjectId); const snap = await ref.get(); if (!snap.exists) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  const cls = await db.collection("classes").doc(snap.data()?.classId).get();
  if (cls.data()?.crUid !== user.uid && snap.data()?.teacherUid !== user.uid) return NextResponse.json({ error: "Only the class representative or assigned teacher can edit this subject." }, { status: 403 });
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (typeof name === "string") {
    if (name.trim().length < 2) return NextResponse.json({ error: "Subject name is too short." }, { status: 400 });
    updates.name = name.trim();
  }
  if (typeof active === "boolean") updates.active = active;
  if (typeof teacherUid === "string" || teacherUid === null) {
    if (cls.data()?.crUid !== user.uid) return NextResponse.json({ error: "Only the class representative can assign a teacher." }, { status: 403 });
    if (teacherUid) { const member = await db.collection("memberships").doc(`${snap.data()?.classId}_${teacherUid}`).get(); if (!member.exists || member.data()?.role !== "teacher" || member.data()?.status !== "approved") return NextResponse.json({ error: "Teacher must be approved first." }, { status: 400 }); }
    updates.teacherUid = teacherUid ?? FieldValue.delete();
  }
  await ref.update(updates);
  if (typeof name === "string" && snap.data()?.googleSheetTabId !== undefined && cls.data()?.spreadsheetId) {
    try { await renameAttendanceTab(user.uid, cls.data()!.spreadsheetId, Number(snap.data()!.googleSheetTabId), name.trim()); } catch (error) { console.error("Subject tab rename failed", error); }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const subjectId = new URL(request.url).searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ error: "Subject ID is required." }, { status: 400 });
  const db = getAdminDb(); const ref = db.collection("subjects").doc(subjectId); const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  const cls = await db.collection("classes").doc(String(snap.data()?.classId)).get();
  if (cls.data()?.crUid !== user.uid && snap.data()?.teacherUid !== user.uid) return NextResponse.json({ error: "Only the class representative or assigned teacher can delete this subject." }, { status: 403 });
  if (cls.data()?.spreadsheetId && snap.data()?.googleSheetTabId !== undefined) {
    try { await deleteAttendanceTab(user.uid, cls.data()!.spreadsheetId, Number(snap.data()!.googleSheetTabId)); } catch (error) { console.error("Subject tab delete failed", error); }
  }
  await ref.delete();
  return NextResponse.json({ ok: true });
}
