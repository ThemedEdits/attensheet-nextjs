import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { attendanceDateIsLocked, karachiDate } from "@/lib/domain";

async function context(request: Request) {
  const user = await authenticated(request); if (!user) return null;
  const body = await request.json().catch(() => ({}));
  return { user, body, db: getAdminDb() };
}
export async function GET(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const url = new URL(request.url); const classId = url.searchParams.get("classId"); const subjectId = url.searchParams.get("subjectId"); const date = url.searchParams.get("date");
  if (!classId || !subjectId) return NextResponse.json({ error: "classId and subjectId are required." }, { status: 400 });
  const db = getAdminDb(); const membership = await db.collection("memberships").doc(`${classId}_${user.uid}`).get(); const cls = await db.collection("classes").doc(classId).get();
  if ((!membership.exists || membership.data()?.status !== "approved") && cls.data()?.crUid !== user.uid) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  let query = db.collection("attendance").where("classId", "==", classId).where("subjectId", "==", subjectId);
  if (date) query = query.where("date", "==", date) as typeof query;
  const snap = await query.get(); return NextResponse.json({ attendance: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
}
export async function POST(request: Request) {
  const result = await context(request); if (!result) return unauthorized();
  const { user, body, db } = result; const { classId, subjectId, date, records } = body;
  if (!classId || !subjectId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(records)) return NextResponse.json({ error: "Invalid attendance payload." }, { status: 400 });
  if (attendanceDateIsLocked(date)) return NextResponse.json({ error: "Historical attendance is locked." }, { status: 409 });
  const cls = await db.collection("classes").doc(classId).get(); const subject = await db.collection("subjects").doc(subjectId).get();
  const member = await db.collection("memberships").doc(`${classId}_${user.uid}`).get();
  if (cls.data()?.crUid !== user.uid && (!member.exists || member.data()?.role !== "teacher" || subject.data()?.teacherUid !== user.uid)) return NextResponse.json({ error: "Only the assigned teacher can mark attendance." }, { status: 403 });
  const batch = db.batch();
  for (const item of records) {
    if (typeof item?.studentUid !== "string" || typeof item?.present !== "boolean") continue;
    batch.set(db.collection("attendance").doc(`${classId}_${subjectId}_${date}_${item.studentUid}`), { classId, subjectId, date, studentUid: item.studentUid, present: item.present, markedBy: user.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  await batch.commit(); return NextResponse.json({ ok: true, date, today: date === karachiDate() });
}
