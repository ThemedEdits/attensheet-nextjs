import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await authenticated(request); if (!user) return unauthorized();
    const [{ getAdminDb }, { FieldValue }] = await Promise.all([
      import("@/lib/firebase-admin"),
      import("firebase-admin/firestore"),
    ]);
    const db = getAdminDb();
    const cls = await db.collection("classes").where("crUid", "==", user.uid).limit(1).get();
    if (cls.empty) return NextResponse.json({ requests: [] });
    const classId = cls.docs[0].id;
    const [students, teachers] = await Promise.all(["studentRequests", "teacherRequests"].map((c) => db.collection(c).where("classId", "==", classId).limit(100).get()));
    const approvedRequests = [...students.docs, ...teachers.docs].filter((item) => item.data().status === "approved");
    for (const requestDoc of approvedRequests) {
      const requestData = requestDoc.data();
      const uid = requestData.studentUid ?? requestData.teacherUid;
      if (!uid) continue;
      const membershipRef = db.collection("memberships").doc(`${classId}_${uid}`);
      const membership = await membershipRef.get();
      if (!membership.exists || membership.data()?.status !== "approved") {
        await membershipRef.set({
          ...requestData,
          classId,
          uid,
          role: requestData.studentUid ? "student" : "teacher",
          status: "approved",
          approvedAt: membership.data()?.approvedAt ?? FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }
    const repairedMemberships = await db.collection("memberships").where("classId", "==", classId).limit(500).get();
    const classData = cls.docs[0].data();
    if (classData.spreadsheetId) {
      try {
        const { addStudentToAttendanceTabs } = await import("@/lib/google");
        const activeSubjects = await db.collection("subjects").where("classId", "==", classId).get();
        const tabs = activeSubjects.docs.filter((item) => item.data().active === true).map((item) => String(item.data().name));
        for (const member of repairedMemberships.docs.filter((item) => item.data().status === "approved" && item.data().role === "student")) {
          const memberData = member.data();
          await addStudentToAttendanceTabs(user.uid, classData.spreadsheetId, tabs, { uid: String(memberData.uid), fullName: memberData.fullName, fatherName: memberData.fatherName, seatNumber: memberData.seatNumber });
        }
      } catch (error) {
        console.error("Approved student sheet reconciliation failed", error);
      }
    }
    const approvedMembers = await Promise.all(repairedMemberships.docs.filter((d) => d.data().status === "approved").map(async (d) => {
      const data = d.data();
      if (data.fullName) return { id: d.id, ...data };
      const user = await db.collection("users").doc(String(data.uid)).get();
      return { id: d.id, ...data, fullName: user.data()?.name ?? String(data.uid), email: user.data()?.email };
    }));
    const pendingRequests = await Promise.all([...students.docs, ...teachers.docs].filter((d) => d.data().status === "pending").map(async (d) => {
      const data = d.data();
      if (!data.teacherUid || data.fullName) return { id: d.id, ...data };
      const teacher = await db.collection("users").doc(String(data.teacherUid)).get();
      return { id: d.id, ...data, fullName: teacher.data()?.name ?? data.teacherUid, email: teacher.data()?.email };
    }));
    return NextResponse.json({
      classId,
      requests: pendingRequests,
      counts: { students: repairedMemberships.docs.filter((d) => d.data().status === "approved" && d.data().role === "student").length, teachers: repairedMemberships.docs.filter((d) => d.data().status === "approved" && d.data().role === "teacher").length },
      members: approvedMembers,
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
    const userSnap = kind === "teacherRequests" && !data.fullName ? await db.collection("users").doc(uid).get() : null;
    const memberData = userSnap?.data();
    const normalizedData = memberData?.name ? { ...data, fullName: memberData.name, email: memberData.email } : data;
    if (normalizedData.fullName && !data.fullName) await ref.set({ fullName: normalizedData.fullName, email: normalizedData.email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await db.collection("memberships").doc(`${data.classId}_${uid}`).set({ ...normalizedData, classId: data.classId, uid, role: kind === "studentRequests" ? "student" : "teacher", status: "approved", approvedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (kind === "studentRequests") {
      const clsData = cls.data() ?? {};
      if (clsData.spreadsheetId) {
        try {
          const { addStudentToAttendanceTabs } = await import("@/lib/google");
          const subjects = await db.collection("subjects").where("classId", "==", data.classId).get();
          await addStudentToAttendanceTabs(user.uid, clsData.spreadsheetId, subjects.docs.filter((item) => item.data().active === true).map((item) => String(item.data().name)), { uid, fullName: data.fullName, fatherName: data.fatherName, seatNumber: data.seatNumber });
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
