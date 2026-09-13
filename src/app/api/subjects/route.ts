import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { addStudentToAttendanceTabs, createAttendanceTab } from "@/lib/google";
export async function GET(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const classId = new URL(request.url).searchParams.get("classId"); if (!classId) return NextResponse.json({ error: "classId is required." }, { status: 400 });
  const db = getAdminDb(); const cls = await db.collection("classes").doc(classId).get();
  const member = await db.collection("memberships").doc(`${classId}_${user.uid}`).get();
  if (cls.data()?.crUid !== user.uid && (!member.exists || member.data()?.status !== "approved")) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const snap = await db.collection("subjects").where("classId", "==", classId).get();
  return NextResponse.json({ subjects: snap.docs.filter((d) => d.data().active === true).map((d) => ({ id: d.id, ...d.data() })) });
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
      const tabId = await createAttendanceTab(user.uid, clsData.spreadsheetId, name.trim(), [["Student UID", "Date", "Status"]]);
      await ref.update({ googleSheetTabId: tabId ?? null });
      const students = await db.collection("memberships").where("classId", "==", classId).limit(500).get();
      await Promise.all(students.docs.filter((student) => student.data().role === "student" && student.data().status === "approved").map((student) => addStudentToAttendanceTabs(user.uid, clsData.spreadsheetId, [name.trim()], { uid: String(student.data().uid), fullName: student.data().fullName, seatNumber: student.data().seatNumber })));
    } catch (error) { console.error("Subject sheet tab creation failed", error); }
  }
  return NextResponse.json({ id: ref.id }, { status: 201 });
}
export async function PATCH(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const { subjectId, active, teacherUid } = await request.json().catch(() => ({}));
  if (!subjectId || (typeof active !== "boolean" && typeof teacherUid !== "string" && teacherUid !== null)) return NextResponse.json({ error: "Invalid subject update." }, { status: 400 });
  const db = getAdminDb(); const ref = db.collection("subjects").doc(subjectId); const snap = await ref.get(); if (!snap.exists) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  const cls = await db.collection("classes").doc(snap.data()?.classId).get();
  if (cls.data()?.crUid !== user.uid) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (typeof active === "boolean") updates.active = active;
  if (typeof teacherUid === "string" || teacherUid === null) {
    if (teacherUid) { const member = await db.collection("memberships").doc(`${snap.data()?.classId}_${teacherUid}`).get(); if (!member.exists || member.data()?.role !== "teacher" || member.data()?.status !== "approved") return NextResponse.json({ error: "Teacher must be approved first." }, { status: 400 }); }
    updates.teacherUid = teacherUid ?? FieldValue.delete();
  }
  await ref.update(updates); return NextResponse.json({ ok: true });
}
