import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await authenticated(request);
  if (!user) return unauthorized();
  const db = getAdminDb();
  const profileSnap = await db.collection("users").doc(user.uid).get();
  const profile = profileSnap.data();
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  let classSnap;
  if (profile.role === "cr") {
    const classes = await db.collection("classes").where("crUid", "==", user.uid).limit(1).get();
    classSnap = classes.docs[0];
  } else {
    const memberships = await db.collection("memberships").where("uid", "==", user.uid).limit(20).get();
    const membership = memberships.docs.find((item) => item.data().status === "approved");
    classSnap = membership ? await db.collection("classes").doc(String(membership.data().classId)).get() : undefined;
  }
  if (!classSnap?.exists) return NextResponse.json({ profile, class: null, subjects: [], memberCount: 0, attendance: [] });

  const classData = classSnap.data() ?? {};
  const classId = classSnap.id;
  const [subjectSnap, memberSnap, attendanceSnap] = await Promise.all([
    db.collection("subjects").where("classId", "==", classId).get(),
    db.collection("memberships").where("classId", "==", classId).limit(500).get(),
    profile.role === "student" ? db.collection("attendance").where("classId", "==", classId).limit(1000).get() : Promise.resolve(null),
  ]);
  const attendance = attendanceSnap?.docs
    .map((item) => item.data())
    .filter((item) => item.studentUid === user.uid)
    .map((item) => ({ date: String(item.date), present: Boolean(item.present) })) ?? [];
  const members = memberSnap.docs.filter((item) => item.data().status === "approved").map((item) => ({ uid: item.data().uid, fullName: item.data().fullName, role: item.data().role }));
  const subjects = await Promise.all(subjectSnap.docs.filter((item) => item.data().active === true).map(async (item) => {
    const data = item.data();
    const teacher = data.teacherUid ? await db.collection("users").doc(String(data.teacherUid)).get() : null;
    return { id: item.id, ...data, teacherName: teacher?.data()?.name ?? null };
  }));
  return NextResponse.json({
    profile,
    class: { id: classId, ...classData },
    subjects,
    members,
    memberCount: memberSnap.docs.filter((item) => item.data().status === "approved" && item.data().role === "student").length,
    attendance,
  });
}
