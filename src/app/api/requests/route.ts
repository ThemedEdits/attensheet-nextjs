import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const db = getAdminDb(); const cls = await db.collection("classes").where("crUid", "==", user.uid).limit(1).get();
  if (cls.empty) return NextResponse.json({ requests: [] });
  const classId = cls.docs[0].id;
  const [students, teachers] = await Promise.all(["studentRequests", "teacherRequests"].map((c) => db.collection(c).where("classId", "==", classId).limit(100).get()));
  return NextResponse.json({ requests: [...students.docs, ...teachers.docs].filter((d) => d.data().status === "pending").map((d) => ({ id: d.id, ...d.data() })) });
}
export async function PATCH(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const { requestId, kind, decision, subjectId } = await request.json().catch(() => ({}));
  if (!requestId || !["studentRequests", "teacherRequests"].includes(kind) || !["approved", "rejected"].includes(decision)) return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  const db = getAdminDb(); const ref = db.collection(kind).doc(requestId); const snap = await ref.get(); if (!snap.exists) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const data = snap.data()!; const cls = await db.collection("classes").doc(data.classId).get();
  if (!cls.exists || cls.data()?.crUid !== user.uid) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  await ref.update({ status: decision, updatedAt: FieldValue.serverTimestamp() });
  if (decision === "approved") {
    const uid = kind === "studentRequests" ? data.studentUid : data.teacherUid;
    await db.collection("memberships").doc(`${data.classId}_${uid}`).set({ classId: data.classId, uid, role: kind === "studentRequests" ? "student" : "teacher", status: "approved", ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (kind === "teacherRequests" && subjectId) await db.collection("subjects").doc(subjectId).update({ teacherUid: uid, updatedAt: FieldValue.serverTimestamp() });
  }
  return NextResponse.json({ ok: true });
}
