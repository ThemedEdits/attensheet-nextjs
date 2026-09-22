import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { toTitleCase } from "@/lib/title-case";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await authenticated(request);
    if (!user) return unauthorized();

    const url = new URL(request.url);
    let classId = url.searchParams.get("classId");

    if (!classId) {
      const own = await prisma.class.findFirst({ where: { crUid: user.uid } });
      if (own) {
        classId = own.id;
      } else {
        const teacherMem = await prisma.membership.findFirst({ where: { uid: user.uid, status: "approved", role: "teacher" } });
        if (teacherMem) {
          classId = teacherMem.classId;
        }
      }
    }

    if (!classId) return NextResponse.json({ error: "Class not found." }, { status: 404 });

    const clsData = await prisma.class.findUnique({ where: { id: classId } });
    if (!clsData) return NextResponse.json({ error: "Class not found." }, { status: 404 });

    const isCr = clsData.crUid === user.uid;
    const userMem = await prisma.membership.findUnique({ where: { id: `${classId}_${user.uid}` } });
    const isTeacher = userMem?.role === "teacher" && userMem?.status === "approved";

    if (!isCr && !isTeacher) {
      return NextResponse.json({ error: "Only Class Representatives and Teachers can view the student roster." }, { status: 403 });
    }

    const membersDocs = await prisma.membership.findMany({
      where: { classId, role: "student", status: "approved" },
    });

    const secondaryCrUid = clsData.secondaryCrUid ?? null;

    const students = await Promise.all(
      membersDocs.map(async (data) => {
        const studentUid = data.uid;
        let email = null;
        let fullName = data.fullName;

        if (!email || !fullName) {
          const uSnap = await prisma.user.findUnique({ where: { uid: studentUid! } });
          if (uSnap) {
            email = email || uSnap.email;
            fullName = fullName || uSnap.displayName;
          }
        }

        const isPrimaryCr = studentUid === clsData.crUid;
        const isSecondaryCr = !isPrimaryCr && (studentUid === secondaryCrUid || data.isSecondaryCr === true);

        return {
          id: data.id,
          uid: studentUid,
          fullName: fullName || "Unnamed Student",
          fatherName: data.fatherName || "",
          seatNumber: data.seatNumber || "",
          
          isPrimaryCr,
          isSecondaryCr,
          createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : "",
        };
      })
    );

    students.sort((a, b) => {
      if (a.seatNumber && b.seatNumber) {
        return a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true });
      }
      return a.fullName.localeCompare(b.fullName);
    });

    const crSelfEnrolled = students.some((s) => s.uid === clsData.crUid);

    let teachers: Array<{
      id: string;
      uid: string;
      fullName: string;
      email: string;
      subjects: Array<{ id: string; name: string }>;
      approvedAt?: string;
      createdAt?: string;
    }> = [];

    if (isCr) {
      const [teachersDocs, subjectsDocs] = await Promise.all([
        prisma.membership.findMany({ where: { classId, role: "teacher", status: "approved" } }),
        prisma.subject.findMany({ where: { classId } }),
      ]);

      const subjectsByTeacher = new Map<string, Array<{ id: string; name: string }>>();
      subjectsDocs.forEach((subData) => {
        if (subData.teacherUid && subData.active !== false) {
          const list = subjectsByTeacher.get(subData.teacherUid) || [];
          list.push({ id: subData.id, name: String(subData.name || "Unnamed Subject") });
          subjectsByTeacher.set(subData.teacherUid, list);
        }
      });

      teachers = await Promise.all(
        teachersDocs.map(async (data) => {
          const teacherUid = data.uid;
          let email = null;
          let fullName = data.fullName;

          if (!email || !fullName) {
            const uSnap = await prisma.user.findUnique({ where: { uid: teacherUid } });
            if (uSnap) {
              email = email || uSnap.email;
              fullName = fullName || uSnap.displayName;
            }
          }

          const teacherSubjects = subjectsByTeacher.get(teacherUid) || [];

          return {
            id: data.id,
            uid: teacherUid,
            fullName: fullName || "Unnamed Teacher",
            email: email || "No email available",
            subjects: teacherSubjects,
            approvedAt: data.createdAt ? new Date(data.createdAt).toISOString() : "", // fallback for approvedAt
            createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : "",
          };
        })
      );

      teachers.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    return NextResponse.json({
      class: clsData,
      students,
      teachers,
      secondaryCrUid,
      crSelfEnrolled,
      isCr,
      isTeacher,
    });
  } catch (error) {
    console.error("GET /api/students error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await authenticated(request);
    if (!user) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const { classId, action } = body;

    if (!classId || !action) {
      return NextResponse.json({ error: "classId and action are required." }, { status: 400 });
    }

    const clsData = await prisma.class.findUnique({ where: { id: classId } });
    if (!clsData) return NextResponse.json({ error: "Class not found." }, { status: 404 });

    const isCr = clsData.crUid === user.uid;
    const userMem = await prisma.membership.findUnique({ where: { id: `${classId}_${user.uid}` } });
    const isTeacher = userMem?.role === "teacher" && userMem?.status === "approved";

    if (!isCr && !isTeacher) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // ACTION: Edit Student Details
    if (action === "edit_details") {
      const { studentUid, fullName, fatherName, seatNumber } = body;
      if (!studentUid || !fullName || !seatNumber) {
        return NextResponse.json({ error: "Student UID, full name, and seat number are required." }, { status: 400 });
      }

      const memId = `${classId}_${studentUid}`;
      const memSnap = await prisma.membership.findUnique({ where: { id: memId } });
      if (!memSnap || memSnap.status !== "approved") {
        return NextResponse.json({ error: "Student membership not found." }, { status: 404 });
      }

      // Check if seatNumber is already taken by another student
      const conflictDoc = await prisma.membership.findFirst({
        where: {
          classId,
          status: "approved",
          uid: { not: studentUid },
          seatNumber: { equals: String(seatNumber).trim(), mode: "insensitive" }
        }
      });
      if (conflictDoc) {
        return NextResponse.json({ error: `Seat number ${seatNumber} is already used by another student.` }, { status: 409 });
      }

      await prisma.membership.update({
        where: { id: memId },
        data: {
          fullName: toTitleCase(String(fullName)),
          fatherName: toTitleCase(String(fatherName ?? "")),
          seatNumber: String(seatNumber).trim(),
        }
      });

      // Update studentRequests doc if exists
      const reqSnap = await prisma.studentRequest.findFirst({
        where: { classId, uid: studentUid }
      });
      if (reqSnap) {
        await prisma.studentRequest.update({
          where: { id: reqSnap.id },
          data: {
            fullName: toTitleCase(String(fullName)),
            fatherName: toTitleCase(String(fatherName ?? "")),
            seatNumber: String(seatNumber).trim(),
          }
        });
      }

      // Sync with Google Sheets if configured
      if (clsData.spreadsheetId) {
        try {
          const { syncAttendanceMatrix } = await import("@/lib/google");
          const activeSubjects = await prisma.subject.findMany({ where: { classId, active: true } });
          const allMembers = await prisma.membership.findMany({ where: { classId, role: "student", status: "approved" } });
          
          for (const sub of activeSubjects) {
            const attDocs = await prisma.attendance.findMany({ where: { classId, subjectId: sub.id }, take: 20000 });
            const dates = [...new Set(attDocs.map((d) => String(d.date)))].sort();
            const byStudent = new Map<string, Record<string, unknown>>();
            attDocs.forEach((d) => {
              byStudent.set(`${d.studentUid}_${d.date}`, d as any);
            });

            const values = [
              [`${clsData.university ?? ""} · ${clsData.department ?? ""} · ${clsData.className ?? ""} · Section ${clsData.section ?? ""} · ${clsData.semester ?? ""}`],
              ["Seat number", "Student name", "Father name", ...dates, "Total"],
              ...allMembers.sort((a, b) => String(a.seatNumber ?? "").localeCompare(String(b.seatNumber ?? ""), undefined, { numeric: true })).map((s) => {
                const statuses = dates.map((date) => byStudent.get(`${s.uid}_${date}`)?.present ? "1" : byStudent.has(`${s.uid}_${date}`) ? "0" : "");
                return [
                  String(s.seatNumber ?? ""),
                  String(s.fullName ?? ""),
                  String(s.fatherName ?? ""),
                  ...statuses,
                  `${statuses.filter((st) => st === "1").length}/${statuses.filter(Boolean).length}`
                ];
              })
            ];

            await syncAttendanceMatrix(clsData.crUid, clsData.spreadsheetId, sub.name ?? "Attendance", values);
          }
        } catch (syncErr) {
          console.error("Google Sheets sync on student edit failed:", syncErr);
        }
      }

      return NextResponse.json({ ok: true, message: "Student details updated successfully." });
    }

    // ACTION: Assign Secondary CR
    if (action === "assign_secondary_cr") {
      const { studentUid } = body;
      if (!studentUid) return NextResponse.json({ error: "studentUid is required." }, { status: 400 });

      if (studentUid === clsData.crUid) {
        return NextResponse.json({ error: "The primary Class Representative cannot be assigned as secondary CR." }, { status: 400 });
      }

      const targetMemSnap = await prisma.membership.findUnique({ where: { id: `${classId}_${studentUid}` } });
      if (!targetMemSnap || targetMemSnap.status !== "approved" || targetMemSnap.role !== "student") {
        return NextResponse.json({ error: "Selected user is not an approved student of this class." }, { status: 400 });
      }

      const previousSecondaryUid = clsData.secondaryCrUid;
      if (previousSecondaryUid && previousSecondaryUid !== studentUid) {
        const prevMemSnap = await prisma.membership.findUnique({ where: { id: `${classId}_${previousSecondaryUid}` } });
        if (prevMemSnap) {
          await prisma.membership.update({ where: { id: `${classId}_${previousSecondaryUid}` }, data: { isSecondaryCr: false } });
        }
      }

      await prisma.membership.update({ where: { id: `${classId}_${studentUid}` }, data: { isSecondaryCr: true } });
      await prisma.class.update({
        where: { id: classId },
        data: { secondaryCrUid: studentUid },
      });

      return NextResponse.json({ ok: true, message: "Student appointed as Secondary CR successfully." });
    }

    // ACTION: Revoke Secondary CR
    if (action === "revoke_secondary_cr") {
      const { studentUid } = body;
      if (!studentUid) return NextResponse.json({ error: "studentUid is required." }, { status: 400 });

      const targetMemSnap = await prisma.membership.findUnique({ where: { id: `${classId}_${studentUid}` } });
      if (targetMemSnap) {
        await prisma.membership.update({ where: { id: `${classId}_${studentUid}` }, data: { isSecondaryCr: false } });
      }

      if (clsData.secondaryCrUid === studentUid) {
        await prisma.class.update({
          where: { id: classId },
          data: { secondaryCrUid: null },
        });
      }

      return NextResponse.json({ ok: true, message: "Secondary CR role revoked successfully." });
    }

    // ACTION: Enroll Primary CR as a Student
    if (action === "enroll_cr") {
      if (!isCr) {
        return NextResponse.json({ error: "Only the primary Class Representative can enroll themselves." }, { status: 403 });
      }

      const { seatNumber, fatherName, fullName } = body;
      if (!seatNumber) {
        return NextResponse.json({ error: "Seat number is required for student enrollment." }, { status: 400 });
      }

      const conflict = await prisma.membership.findFirst({
        where: {
          classId,
          status: "approved",
          uid: { not: user.uid },
          seatNumber: { equals: String(seatNumber).trim(), mode: "insensitive" }
        }
      });
      if (conflict) {
        return NextResponse.json({ error: `Seat number ${seatNumber} is already registered to another student.` }, { status: 409 });
      }

      const crUserSnap = await prisma.user.findUnique({ where: { uid: user.uid } });
      const resolvedName = toTitleCase(fullName || crUserSnap?.displayName || "Class Representative");
      const formattedFatherName = toTitleCase(fatherName || "");

      await prisma.membership.upsert({
        where: { id: `${classId}_${user.uid}` },
        update: {
          role: "student",
          status: "approved",
          isSecondaryCr: false,
          fullName: resolvedName,
          fatherName: formattedFatherName,
          seatNumber: String(seatNumber).trim(),
          
        },
        create: {
          id: `${classId}_${user.uid}`,
          classId,
          uid: user.uid,
          role: "student",
          status: "approved",
          isSecondaryCr: false,
          fullName: resolvedName,
          fatherName: formattedFatherName,
          seatNumber: String(seatNumber).trim(),
          
        }
      });

      if (clsData.spreadsheetId) {
        try {
          const { addStudentToAttendanceTabs } = await import("@/lib/google");
          const activeSubjects = await prisma.subject.findMany({ where: { classId, active: true } });
          const tabNames = activeSubjects.map((s) => String(s.name));
          await addStudentToAttendanceTabs(user.uid, clsData.spreadsheetId, tabNames, {
            uid: user.uid,
            fullName: resolvedName,
            fatherName: formattedFatherName,
            seatNumber: String(seatNumber).trim(),
          });
        } catch (syncErr) {
          console.error("Google Sheets sync on CR enrollment failed:", syncErr);
        }
      }

      return NextResponse.json({ ok: true, message: "Class Representative enrolled into student roster." });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/students error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await authenticated(request);
    if (!user) return unauthorized();

    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    const studentUid = url.searchParams.get("studentUid") || "";
    const teacherUid = url.searchParams.get("teacherUid");

    if (!classId || (!studentUid && !teacherUid)) {
      return NextResponse.json({ error: "classId and member UID are required." }, { status: 400 });
    }

    const clsData = await prisma.class.findUnique({ where: { id: classId } });
    if (!clsData) return NextResponse.json({ error: "Class not found." }, { status: 404 });

    const isCr = clsData.crUid === user.uid;
    const userMem = await prisma.membership.findUnique({ where: { id: `${classId}_${user.uid}` } });
    const isTeacher = userMem?.role === "teacher" && userMem?.status === "approved";

    // Handle Teacher Removal (CR only)
    if (teacherUid) {
      if (!isCr) {
        return NextResponse.json({ error: "Only the Class Representative can remove a teacher." }, { status: 403 });
      }
      const memSnap = await prisma.membership.findUnique({ where: { id: `${classId}_${teacherUid}` } });
      if (!memSnap) {
        return NextResponse.json({ error: "Teacher membership not found." }, { status: 404 });
      }

      await prisma.$transaction([
        prisma.membership.delete({ where: { id: `${classId}_${teacherUid}` } }),
        prisma.teacherRequest.deleteMany({ where: { classId, uid: teacherUid } }),
        prisma.subject.updateMany({ where: { classId, teacherUid }, data: { teacherUid: null } }),
      ]);

      return NextResponse.json({ ok: true, deleted: true, message: "Teacher removed from class successfully." });
    }

    if (!isCr && !isTeacher) {
      return NextResponse.json({ error: "Only the Class Representative or Teacher can remove a student." }, { status: 403 });
    }

    // Safety guard: Cannot delete the Primary CR workspace owner
    if (studentUid === clsData.crUid) {
      return NextResponse.json({ error: "The primary Class Representative workspace owner cannot be removed." }, { status: 403 });
    }

    const memSnap = await prisma.membership.findUnique({ where: { id: `${classId}_${studentUid}` } });
    if (!memSnap) {
      return NextResponse.json({ error: "Student membership not found." }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.membership.delete({ where: { id: `${classId}_${studentUid}` } }),
      prisma.studentRequest.deleteMany({ where: { classId, uid: studentUid! } }),
      ...(clsData.secondaryCrUid === studentUid ? [prisma.class.update({ where: { id: classId }, data: { secondaryCrUid: null } })] : []),
      prisma.attendance.deleteMany({ where: { classId, studentUid: studentUid! } }),
    ]);

    // 5. Purge student from Google Sheets workbook across all subject tabs
    if (clsData.spreadsheetId) {
      try {
        const { syncAttendanceMatrix } = await import("@/lib/google");
        const activeSubjects = await prisma.subject.findMany({ where: { classId, active: true } });
        const remainingMembers = await prisma.membership.findMany({ where: { classId, role: "student", status: "approved" } });

        for (const sub of activeSubjects) {
          const attDocs = await prisma.attendance.findMany({ where: { classId, subjectId: sub.id }, take: 20000 });
          const dates = [...new Set(attDocs.map((d) => String(d.date)))].sort();
          const byStudent = new Map<string, Record<string, unknown>>();
          attDocs.forEach((d) => {
            byStudent.set(`${d.studentUid}_${d.date}`, d as any);
          });

          const values = [
            [`${clsData.university ?? ""} · ${clsData.department ?? ""} · ${clsData.className ?? ""} · Section ${clsData.section ?? ""} · ${clsData.semester ?? ""}`],
            ["Seat number", "Student name", "Father name", ...dates, "Total"],
            ...remainingMembers.sort((a, b) => String(a.seatNumber ?? "").localeCompare(String(b.seatNumber ?? ""), undefined, { numeric: true })).map((s) => {
              const statuses = dates.map((date) => byStudent.get(`${s.uid}_${date}`)?.present ? "1" : byStudent.has(`${s.uid}_${date}`) ? "0" : "");
              return [
                String(s.seatNumber ?? ""),
                String(s.fullName ?? ""),
                String(s.fatherName ?? ""),
                ...statuses,
                `${statuses.filter((st) => st === "1").length}/${statuses.filter(Boolean).length}`
              ];
            })
          ];

          await syncAttendanceMatrix(clsData.crUid, clsData.spreadsheetId, sub.name ?? "Attendance", values);
        }
      } catch (sheetErr) {
        console.error("Google Sheets matrix cleanup on student deletion failed:", sheetErr);
      }
    }

    return NextResponse.json({ ok: true, deleted: true, message: "Student completely removed from class roster, attendance records, and Google Sheets." });
  } catch (error) {
    console.error("DELETE /api/students error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error." }, { status: 500 });
  }
}
