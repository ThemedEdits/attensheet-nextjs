import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await authenticated(request); if (!user) return unauthorized();
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const db = getAdminDb();
    const cls = await db.collection("classes").where("crUid", "==", user.uid).limit(1).get();
    if (cls.empty) return NextResponse.json({ requests: [] });
    const classId = cls.docs[0].id;
    const [students, teachers] = await Promise.all(["studentRequests", "teacherRequests"].map((c) => db.collection(c).where("classId", "==", classId).limit(100).get()));
    const memberships = await db.collection("memberships").where("classId", "==", classId).limit(500).get();
    return NextResponse.json({
      classId,
      requests: [...students.docs, ...teachers.docs].filter((d) => d.data().status === "pending").map((d) => ({ id: d.id, ...d.data() })),
      counts: { students: memberships.docs.filter((d) => d.data().status === "approved" && d.data().role === "student").length, teachers: memberships.docs.filter((d) => d.data().status === "approved" && d.data().role === "teacher").length },
      members: memberships.docs.filter((d) => d.data().status === "approved").map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (error) {
    console.error("Request list failed", error);
    return NextResponse.json({ error: error instanceof Error ? `Request list failed: ${error.message}` : "Request list failed." }, { status: 500 });
  }
}
export async function PATCH(request: Request) {
  try {
  const user = await authenticated(request); if (!user) return unauthorized();
  const [{ getAdminDb }, { FieldValue }] = await Promise.all([
    import("@/lib/firebase-admin"),
    import("firebase-admin/firestore"),
  ]);
  const { requestId, kind, decision, subjectId } = await request.json().catch(() => ({}));
  if (!requestId || !["studentRequests", "teacherRequests"].includes(kind) || !["approved", "rejected"].includes(decision)) return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  const db = getAdminDb(); const ref = db.collection(kind).doc(requestId); const snap = await ref.get(); if (!snap.exists) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const data = snap.data()!; const cls = await db.collection("classes").doc(data.classId).get();
  if (!cls.exists || cls.data()?.crUid !== user.uid) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (decision === "approved" && kind === "teacherRequests" && subjectId) {
    const subject = await db.collection("subjects").doc(subjectId).get();
    if (!subject.exists || subject.data()?.classId !== data.classId) return NextResponse.json({ error: "Subject does not belong to this class." }, { status: 400 });
  }
  await ref.update({ status: decision, updatedAt: FieldValue.serverTimestamp() });
  if (decision === "approved") {
    const uid = kind === "studentRequests" ? data.studentUid : data.teacherUid;
    await db.collection("memberships").doc(`${data.classId}_${uid}`).set({ classId: data.classId, uid, role: kind === "studentRequests" ? "student" : "teacher", status: "approved", ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (kind === "studentRequests") {
      const clsData = cls.data() ?? {};
      if (clsData.spreadsheetId) {
        try {
          const { getAuthorizedSheets } = await import("@/lib/google");
          const subjects = await db.collection("subjects").where("classId", "==", data.classId).get();
          const sheets = await getAuthorizedSheets(user.uid);
          for (const subject of subjects.docs.filter((item) => item.data().active === true)) {
            await sheets.spreadsheets.values.append({ spreadsheetId: clsData.spreadsheetId, range: `${subject.data().name}!A:A`, valueInputOption: "USER_ENTERED", requestBody: { values: [[uid]] } });
          }
        } catch (error) { console.error("Student sheet enrollment failed", error); }
      }
    }
    if (kind === "teacherRequests" && subjectId) {
      await db.collection("subjects").doc(subjectId).update({ teacherUid: uid, updatedAt: FieldValue.serverTimestamp() });
    }
  }
  return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Request decision failed", error);
    return NextResponse.json({ error: error instanceof Error ? `Request update failed: ${error.message}` : "Request update failed." }, { status: 500 });
  }
}
