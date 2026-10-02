import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getIsoWeek(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

    if (!classData) return NextResponse.json({ error: "No class found." }, { status: 404 });

    const classId = classData.id;

    const [attendances, subjects, members] = await Promise.all([
      prisma.attendance.findMany({ where: { classId } }),
      prisma.subject.findMany({ where: { classId } }),
      prisma.membership.findMany({ where: { classId, status: "approved" } }),
    ]);

    const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
    const memberMap = Object.fromEntries(members.map((m) => [m.uid, m]));

    // Initialize stats
    const overall = {
      dayOfWeek: {} as Record<string, { present: number; absent: number }>,
      subjects: {} as Record<string, { present: number; absent: number }>,
      weeks: {} as Record<string, { present: number; absent: number }>,
    };

    const studentStats = {} as Record<string, {
      dayOfWeek: Record<string, { present: number; absent: number }>;
      subjects: Record<string, { present: number; absent: number }>;
      weeks: Record<string, { present: number; absent: number }>;
      totalPresent: number;
      totalAbsent: number;
    }>;

    for (const record of attendances) {
      const isPresent = record.present;
      const [y, m, d] = record.date.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayName = days[dateObj.getDay()];
      const weekName = getIsoWeek(record.date);
      const subjectName = subjectMap[record.subjectId] || "Unknown";
      const studentUid = record.studentUid;

      // Ensure overall objects exist
      if (!overall.dayOfWeek[dayName]) overall.dayOfWeek[dayName] = { present: 0, absent: 0 };
      if (!overall.subjects[subjectName]) overall.subjects[subjectName] = { present: 0, absent: 0 };
      if (!overall.weeks[weekName]) overall.weeks[weekName] = { present: 0, absent: 0 };

      // Update overall
      if (isPresent) {
        overall.dayOfWeek[dayName].present++;
        overall.subjects[subjectName].present++;
        overall.weeks[weekName].present++;
      } else {
        overall.dayOfWeek[dayName].absent++;
        overall.subjects[subjectName].absent++;
        overall.weeks[weekName].absent++;
      }

      // Ensure student objects exist
      if (!studentStats[studentUid]) {
        studentStats[studentUid] = {
          dayOfWeek: {},
          subjects: {},
          weeks: {},
          totalPresent: 0,
          totalAbsent: 0,
        };
      }

      const st = studentStats[studentUid];
      if (!st.dayOfWeek[dayName]) st.dayOfWeek[dayName] = { present: 0, absent: 0 };
      if (!st.subjects[subjectName]) st.subjects[subjectName] = { present: 0, absent: 0 };
      if (!st.weeks[weekName]) st.weeks[weekName] = { present: 0, absent: 0 };

      if (isPresent) {
        st.dayOfWeek[dayName].present++;
        st.subjects[subjectName].present++;
        st.weeks[weekName].present++;
        st.totalPresent++;
      } else {
        st.dayOfWeek[dayName].absent++;
        st.subjects[subjectName].absent++;
        st.weeks[weekName].absent++;
        st.totalAbsent++;
      }
    }

    return NextResponse.json({
      overall,
      studentStats,
      members: members.map(m => ({ uid: m.uid, name: m.fullName || m.uid, role: m.role, seatNumber: m.seatNumber })),
      effectiveRole,
      currentUserUid: user.uid,
    });
  } catch (error) {
    console.error("GET /api/stats failed:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
