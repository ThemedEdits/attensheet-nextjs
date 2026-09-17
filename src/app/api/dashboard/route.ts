import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
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
    if (!classSnap?.exists) {
      let pendingRequest = null;
      if (profile.role === "student" || profile.role === "teacher") {
        const collection = profile.role === "student" ? "studentRequests" : "teacherRequests";
        const identityField = profile.role === "student" ? "studentUid" : "teacherUid";
        const reqSnap = await db
          .collection(collection)
          .where(identityField, "==", user.uid)
          .where("status", "==", "pending")
          .limit(1)
          .get();
        if (!reqSnap.empty) {
          const reqDoc = reqSnap.docs[0];
          const reqData = reqDoc.data();
          const targetClassDoc = await db.collection("classes").doc(String(reqData.classId)).get();
          if (targetClassDoc.exists) {
            const tcData = targetClassDoc.data()!;
            const crSnap = await db.collection("users").doc(tcData.crUid).get();
            pendingRequest = {
              id: reqDoc.id,
              classId: targetClassDoc.id,
              className: tcData.className || "Class",
              department: tcData.department || "",
              university: tcData.university || "",
              section: tcData.section || "",
              semester: tcData.semester || "",
              classCode: tcData.classCode || reqData.classCode || "",
              crName: crSnap.data()?.name || "Class Representative",
              seatNumber: reqData.seatNumber || "",
              fullName: reqData.fullName || profile.name || "",
              fatherName: reqData.fatherName || "",
              status: "pending",
              createdAt: reqData.createdAt?.toDate ? reqData.createdAt.toDate().toISOString() : null,
            };
          }
        }
      }
      return NextResponse.json({
        profile,
        class: null,
        pendingRequest,
        subjects: [],
        memberCount: 0,
        attendance: [],
      });
    }

    const classData = classSnap.data() ?? {};
    const classId = classSnap.id;
    const [subjectSnap, memberSnap, attendanceSnap] = await Promise.all([
      db.collection("subjects").where("classId", "==", classId).get(),
      db.collection("memberships").where("classId", "==", classId).limit(500).get(),
      profile.role === "student" ? db.collection("attendance").where("classId", "==", classId).limit(1000).get() : Promise.resolve(null),
    ]);
    const subjectMap = Object.fromEntries(subjectSnap.docs.map((s) => [s.id, s.data().name]));
    const attendance = attendanceSnap?.docs
      .map((item) => item.data())
      .filter((item) => item.studentUid === user.uid)
      .map((item) => ({
        date: String(item.date),
        subjectId: String(item.subjectId),
        subjectName: subjectMap[String(item.subjectId)] ?? "Subject",
        present: Boolean(item.present),
      })) ?? [];
    const members = await Promise.all(
      memberSnap.docs
        .filter((item) => item.data().status === "approved")
        .map(async (item) => {
          const d = item.data();
          let fullName = d.fullName;
          if (!fullName) {
            const u = await db.collection("users").doc(d.uid).get();
            fullName = u.data()?.name ?? u.data()?.email ?? d.uid;
          }
          return { uid: d.uid, fullName, role: d.role };
        })
    );

    const userMembershipDoc = memberSnap.docs.find((d) => d.data().uid === user.uid && d.data().status === "approved");
    const isSecondaryCr = profile.role === "student" && (userMembershipDoc?.data()?.isSecondaryCr === true || classData.secondaryCrUid === user.uid);
    const isCrEnrolledAsStudent = profile.role === "cr" && memberSnap.docs.some((item) => item.data().uid === user.uid && item.data().role === "student" && item.data().status === "approved");

    let subjectDocs = subjectSnap.docs.filter((item) => item.data().active === true);
    if (profile.role === "teacher") {
      subjectDocs = subjectDocs.filter((item) => item.data().teacherUid === user.uid);
    }
    // Note: If user is secondary CR or CR, they get all active subjects!

    const subjects = await Promise.all(subjectDocs.map(async (item) => {
      const data = item.data();
      const teacher = data.teacherUid ? await db.collection("users").doc(String(data.teacherUid)).get() : null;
      return { id: item.id, ...data, teacherName: teacher?.data()?.name ?? null };
    }));
    let pendingRequestsCount = 0;
    if (profile.role === "cr" && classId) {
      try {
        const [studentCountSnap, teacherCountSnap] = await Promise.all([
          db.collection("studentRequests").where("classId", "==", classId).where("status", "==", "pending").count().get(),
          db.collection("teacherRequests").where("classId", "==", classId).where("status", "==", "pending").count().get(),
        ]);
        pendingRequestsCount = (studentCountSnap.data().count ?? 0) + (teacherCountSnap.data().count ?? 0);
      } catch (countErr) {
        console.error("Failed to query pending requests count:", countErr);
      }
    }

    return NextResponse.json({
      profile: { ...profile, isSecondaryCr },
      class: { id: classId, ...classData },
      subjects,
      members,
      memberCount: memberSnap.docs.filter((item) => item.data().status === "approved" && item.data().role === "student").length,
      attendance,
      secondaryCrUid: classData.secondaryCrUid ?? null,
      isSecondaryCr,
      isCrEnrolledAsStudent,
      pendingRequestsCount,
    });
  } catch (error) {
    console.error("GET /api/dashboard failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}
