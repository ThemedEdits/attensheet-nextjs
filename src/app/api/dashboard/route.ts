import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await authenticated(request);
    if (!user) return unauthorized();
    
    const profile = await prisma.user.findUnique({ where: { uid: user.uid } });
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    const cookieStore = await import("next/headers").then(m => m.cookies());
    const viewAsStudent = cookieStore.get("attensheet_view_as_student")?.value === "true";
    const effectiveRole = (profile.role === "cr" && viewAsStudent) ? "student" : profile.role;

    let classData;
    if (profile.role === "cr") {
      classData = await prisma.class.findFirst({ where: { crUid: user.uid } });
    } else {
      const membership = await prisma.membership.findFirst({
        where: { uid: user.uid, status: "approved" },
        include: { class: true }
      });
      classData = membership?.class;
    }

    if (!classData) {
      let pendingRequest = null;
      if (profile.role === "student" || profile.role === "teacher") {
        if (profile.role === "student") {
          const req = await prisma.studentRequest.findFirst({
            where: { uid: user.uid, status: "pending" },
            include: { class: { include: { primaryCr: true } } }
          });
          if (req) {
            pendingRequest = {
              id: req.id,
              classId: req.classId,
              className: req.class.className || "Class",
              department: req.class.department || "",
              university: req.class.university || "",
              section: req.class.section || "",
              semester: req.class.semester || "",
              classCode: req.class.classCode || "",
              crName: req.class.primaryCr?.displayName || "Class Representative",
              seatNumber: req.seatNumber || "",
              fullName: req.fullName || profile.displayName || "",
              fatherName: req.fatherName || "",
              status: "pending",
              createdAt: req.createdAt ? req.createdAt.toISOString() : null,
            };
          }
        } else {
          const req = await prisma.teacherRequest.findFirst({
            where: { uid: user.uid, status: "pending" },
            include: { class: { include: { primaryCr: true } } }
          });
          if (req) {
            pendingRequest = {
              id: req.id,
              classId: req.classId,
              className: req.class.className || "Class",
              department: req.class.department || "",
              university: req.class.university || "",
              section: req.class.section || "",
              semester: req.class.semester || "",
              classCode: req.class.classCode || "",
              crName: req.class.primaryCr?.displayName || "Class Representative",
              seatNumber: "",
              fullName: req.displayName || profile.displayName || "",
              fatherName: "",
              status: "pending",
              createdAt: req.createdAt ? req.createdAt.toISOString() : null,
            };
          }
        }
      }
      return NextResponse.json({
        profile: { ...profile, name: profile.displayName },
        class: null,
        pendingRequest,
        subjects: [],
        memberCount: 0,
        attendance: [],
      });
    }

    const classId = classData.id;
    
    const [subjectsRes, membersRes, attendanceRes, sessionsRes] = await Promise.all([
      prisma.subject.findMany({ where: { classId } }),
      prisma.membership.findMany({ 
        where: { classId },
        include: { user: true }
      }),
      effectiveRole === "student" 
        ? prisma.attendance.findMany({ where: { classId } })
        : Promise.resolve([]),
      prisma.attendance.findMany({
        where: { classId },
        select: { subjectId: true, date: true },
        distinct: ['subjectId', 'date']
      })
    ]);

    const subjectMap = Object.fromEntries(subjectsRes.map((s) => [s.id, s.name]));
    
    const attendance = attendanceRes
      .filter((item) => item.studentUid === user.uid)
      .map((item) => ({
        date: String(item.date),
        subjectId: String(item.subjectId),
        subjectName: subjectMap[String(item.subjectId)] ?? "Subject",
        present: Boolean(item.present),
      }));

    const members = membersRes
      .filter((item) => item.status === "approved")
      .map((item) => ({
        uid: item.uid,
        fullName: item.fullName || item.user?.displayName || item.user?.email || item.uid,
        role: item.role,
      }));

    const userMembershipDoc = membersRes.find((d) => d.uid === user.uid && d.status === "approved");
    const isSecondaryCr = effectiveRole === "student" && (userMembershipDoc?.isSecondaryCr === true || classData.secondaryCrUid === user.uid);
    const isCrEnrolledAsStudent = profile.role === "cr" && membersRes.some((item) => item.uid === user.uid && item.role === "student" && item.status === "approved");

    let subjectDocs = subjectsRes.filter((item) => item.active === true);
    if (effectiveRole === "teacher") {
      subjectDocs = subjectDocs.filter((item) => item.teacherUid === user.uid);
    }
    
    const subjects = await Promise.all(subjectDocs.map(async (item) => {
      let teacherName = item.teacherName;
      if (!teacherName && item.teacherUid) {
        const teacher = await prisma.user.findUnique({ where: { uid: item.teacherUid } });
        teacherName = teacher?.displayName || null;
      }
      return { ...item, teacherName };
    }));

    let pendingRequestsCount = 0;
    if (effectiveRole === "cr" && classId) {
      try {
        const [studentCount, teacherCount] = await Promise.all([
          prisma.studentRequest.count({ where: { classId, status: "pending" } }),
          prisma.teacherRequest.count({ where: { classId, status: "pending" } }),
        ]);
        pendingRequestsCount = studentCount + teacherCount;
      } catch (countErr) {
        console.error("Failed to query pending requests count:", countErr);
      }
    }

    return NextResponse.json({
      profile: { 
        ...profile, 
        name: profile.displayName, 
        isSecondaryCr, 
        role: effectiveRole, 
        actualRole: profile.role,
        fullName: userMembershipDoc?.fullName || profile.displayName,
        fatherName: userMembershipDoc?.fatherName || null,
        seatNumber: userMembershipDoc?.seatNumber || null
      },
      class: { ...classData },
      subjects,
      members,
      memberCount: membersRes.filter((item) => item.status === "approved" && item.role === "student").length,
      attendance,
      secondaryCrUid: classData.secondaryCrUid ?? null,
      isSecondaryCr,
      isCrEnrolledAsStudent,
      pendingRequestsCount,
      sessions: sessionsRes.map(s => ({ subjectId: s.subjectId, date: s.date })),
    });
  } catch (error) {
    console.error("GET /api/dashboard failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}
