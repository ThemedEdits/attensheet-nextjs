import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { toTitleCase } from "@/lib/title-case";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await authenticated(request);
    if (!user) return unauthorized();
    
    const cls = await prisma.class.findFirst({ where: { crUid: user.uid } });
    if (!cls) return NextResponse.json({ requests: [] });
    
    const classId = cls.id;

    const [students, teachers] = await Promise.all([
      prisma.studentRequest.findMany({ where: { classId, status: "pending" } }),
      prisma.teacherRequest.findMany({ where: { classId, status: "pending" } }),
    ]);

    const pendingRequests = await Promise.all([
      ...students.map(s => ({ ...s, kind: 'studentRequests', studentUid: s.uid, teacherUid: undefined })), 
      ...teachers.map(t => ({ ...t, fullName: t.displayName, kind: 'teacherRequests', teacherUid: t.uid, studentUid: undefined }))
    ].map(async (data) => {
      if (!data.teacherUid || data.fullName) return data;
      const teacher = await prisma.user.findUnique({ where: { uid: data.teacherUid } });
      return { ...data, fullName: teacher?.displayName ?? data.teacherUid, email: teacher?.email };
    }));

    return NextResponse.json({
      classId,
      requests: pendingRequests,
    });
  } catch (error) {
    console.error("Request list failed", error);
    return NextResponse.json({ error: "Failed to retrieve pending requests." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await authenticated(request);
    if (!user) return unauthorized();
    const body = await request.json().catch(() => ({}));
    const { action, requestId, kind, decision, subjectId } = body;

    // BULK ACTIONS: approve_all or reject_all
    if (action === "approve_all" || action === "reject_all") {
      const targetDecision = action === "approve_all" ? "approved" : "rejected";
      const cls = await prisma.class.findFirst({ where: { crUid: user.uid } });
      if (!cls) return NextResponse.json({ error: "Class not found." }, { status: 404 });
      const classId = cls.id;

      const [pendingStudentDocs, pendingTeacherDocs] = await Promise.all([
        prisma.studentRequest.findMany({ where: { classId, status: "pending" }, take: 200 }),
        prisma.teacherRequest.findMany({ where: { classId, status: "pending" }, take: 200 }),
      ]);

      const totalCount = pendingStudentDocs.length + pendingTeacherDocs.length;
      if (totalCount === 0) return NextResponse.json({ ok: true, count: 0, message: "No pending requests to process." });

      // Process Teachers
      for (const tData of pendingTeacherDocs) {
        await prisma.teacherRequest.update({ where: { id: tData.id }, data: { status: targetDecision } });
        if (targetDecision === "approved") {
          const uid = tData.uid;
          let name = tData.displayName;
          let email = tData.email;
          if (!name) {
            const uSnap = await prisma.user.findUnique({ where: { uid } });
            name = uSnap?.displayName || uid;
            email = email || uSnap?.email || null;
          }
          await prisma.membership.upsert({
            where: { id: `${classId}_${uid}` },
            update: { role: "teacher", status: "approved", fullName: toTitleCase(name || "") },
            create: { id: `${classId}_${uid}`, classId, uid, role: "teacher", status: "approved", fullName: toTitleCase(name || "") }
          });
        }
      }

      // Process Students
      let tabNames: string[] = [];
      if (targetDecision === "approved" && cls.spreadsheetId) {
        try {
          const subs = await prisma.subject.findMany({ where: { classId, active: true } });
          tabNames = subs.map(item => String(item.name));
        } catch (subErr) { console.error("Failed fetching subject tabs for bulk sync", subErr); }
      }

      for (const sData of pendingStudentDocs) {
        await prisma.studentRequest.update({ where: { id: sData.id }, data: { status: targetDecision } });
        if (targetDecision === "approved") {
          const uid = sData.uid;
          const formattedFullName = toTitleCase(sData.fullName || "");
          const formattedFatherName = toTitleCase(sData.fatherName || "");
          await prisma.membership.upsert({
            where: { id: `${classId}_${uid}` },
            update: { role: "student", status: "approved", fullName: formattedFullName, fatherName: formattedFatherName, seatNumber: String(sData.seatNumber || "").trim() },
            create: { id: `${classId}_${uid}`, classId, uid, role: "student", status: "approved", fullName: formattedFullName, fatherName: formattedFatherName, seatNumber: String(sData.seatNumber || "").trim() }
          });

          if (cls.spreadsheetId && tabNames.length > 0) {
            try {
              const { addStudentToAttendanceTabs } = await import("@/lib/google");
              await addStudentToAttendanceTabs(user.uid, cls.spreadsheetId, tabNames, {
                uid, fullName: formattedFullName, fatherName: formattedFatherName, seatNumber: String(sData.seatNumber || "").trim(),
              });
            } catch (err) { console.error(`Google Sheets sync failed for student ${uid}`, err); }
          }
        }
      }

      return NextResponse.json({ ok: true, count: totalCount, message: targetDecision === "approved" ? `Approved ${totalCount} requests.` : `Rejected ${totalCount} requests.`, });
    }

    // INDIVIDUAL DECISION
    if (!requestId || !["studentRequests", "teacherRequests"].includes(kind) || !["approved", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
    }
    
    let data: any;
    if (kind === "studentRequests") data = await prisma.studentRequest.findUnique({ where: { id: requestId } });
    else data = await prisma.teacherRequest.findUnique({ where: { id: requestId } });

    if (!data) return NextResponse.json({ error: "Request not found." }, { status: 404 });
    const cls = await prisma.class.findUnique({ where: { id: data.classId } });
    if (!cls || cls.crUid !== user.uid) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    if (decision === "approved" && kind === "teacherRequests" && subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
      if (!subject || subject.classId !== data.classId) {
        return NextResponse.json({ error: "Subject does not belong to this class." }, { status: 400 });
      }
    }

    if (kind === "studentRequests") await prisma.studentRequest.update({ where: { id: requestId }, data: { status: decision } });
    else await prisma.teacherRequest.update({ where: { id: requestId }, data: { status: decision } });

    if (decision === "approved") {
      const uid = data.uid;
      const userSnap = kind === "teacherRequests" && !data.displayName ? await prisma.user.findUnique({ where: { uid } }) : null;
      const normalizedData = userSnap?.displayName ? { ...data, fullName: userSnap.displayName, email: userSnap.email } : (kind === "studentRequests" ? data : { ...data, fullName: data.displayName });
      
      const formattedFullName = toTitleCase(normalizedData.fullName || "");
      const formattedFatherName = toTitleCase(normalizedData.fatherName || "");

      if (normalizedData.fullName && !data.fullName && kind === "studentRequests") {
        await prisma.studentRequest.update({ where: { id: requestId }, data: { fullName: formattedFullName, email: normalizedData.email } });
      } else if (normalizedData.fullName && !data.displayName && kind === "teacherRequests") {
        await prisma.teacherRequest.update({ where: { id: requestId }, data: { displayName: formattedFullName, email: normalizedData.email } });
      }

      await prisma.membership.upsert({
        where: { id: `${data.classId}_${uid}` },
        update: { role: kind === "studentRequests" ? "student" : "teacher", status: "approved", fullName: formattedFullName, fatherName: formattedFatherName, seatNumber: kind === "studentRequests" ? data.seatNumber : undefined },
        create: { id: `${data.classId}_${uid}`, classId: data.classId, uid, role: kind === "studentRequests" ? "student" : "teacher", status: "approved", fullName: formattedFullName, fatherName: formattedFatherName, seatNumber: kind === "studentRequests" ? data.seatNumber : undefined }
      });

      if (kind === "studentRequests") {
        if (cls.spreadsheetId) {
          try {
            const { addStudentToAttendanceTabs } = await import("@/lib/google");
            const subjects = await prisma.subject.findMany({ where: { classId: data.classId, active: true } });
            await addStudentToAttendanceTabs(user.uid, cls.spreadsheetId, subjects.map((item) => String(item.name)), {
              uid, fullName: formattedFullName, fatherName: formattedFatherName, seatNumber: data.seatNumber,
            });
          } catch (error) { console.error("Student sheet enrollment failed", error); }
        }
      }

      if (kind === "teacherRequests" && subjectId) {
        await prisma.subject.update({ where: { id: subjectId }, data: { teacherUid: uid } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Request decision failed", error);
    return NextResponse.json({ error: "Failed to update request decision. Please try again." }, { status: 500 });
  }
}
