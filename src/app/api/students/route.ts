import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { toTitleCase } from "@/lib/title-case";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await authenticated(request);
    if (!user) return unauthorized();

    const url = new URL(request.url);
    let classId = url.searchParams.get("classId");
    const db = getAdminDb();

    if (!classId) {
      const own = await db.collection("classes").where("crUid", "==", user.uid).limit(1).get();
      if (!own.empty) {
        classId = own.docs[0].id;
      } else {
        const membershipSnap = await db.collection("memberships").where("uid", "==", user.uid).where("status", "==", "approved").limit(5).get();
        const teacherMem = membershipSnap.docs.find((d) => d.data().role === "teacher");
        if (teacherMem) {
          classId = String(teacherMem.data().classId);
        }
      }
    }

    if (!classId) return NextResponse.json({ error: "Class not found." }, { status: 404 });

    const clsSnap = await db.collection("classes").doc(classId).get();
    if (!clsSnap.exists) return NextResponse.json({ error: "Class not found." }, { status: 404 });
    const clsData = clsSnap.data()!;

    const isCr = clsData.crUid === user.uid;
    const userMemSnap = await db.collection("memberships").doc(`${classId}_${user.uid}`).get();
    const isTeacher = userMemSnap.exists && userMemSnap.data()?.role === "teacher" && userMemSnap.data()?.status === "approved";

    if (!isCr && !isTeacher) {
      return NextResponse.json({ error: "Only Class Representatives and Teachers can view the student roster." }, { status: 403 });
    }

    const membersSnap = await db.collection("memberships")
      .where("classId", "==", classId)
      .where("role", "==", "student")
      .where("status", "==", "approved")
      .get();

    const secondaryCrUid = clsData.secondaryCrUid ?? null;

    const students = await Promise.all(
      membersSnap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const studentUid = String(data.uid);
        let email = data.email;
        let fullName = data.fullName;

        if (!email || !fullName) {
          const uSnap = await db.collection("users").doc(studentUid).get();
          if (uSnap.exists) {
            email = email || uSnap.data()?.email;
            fullName = fullName || uSnap.data()?.name;
          }
        }

        const isPrimaryCr = studentUid === clsData.crUid;
        const isSecondaryCr = !isPrimaryCr && (studentUid === secondaryCrUid || data.isSecondaryCr === true);

        return {
          id: docSnap.id,
          uid: studentUid,
          fullName: fullName || "Unnamed Student",
          fatherName: data.fatherName || "",
          seatNumber: data.seatNumber || "",
          email: email || "No email available",
          isPrimaryCr,
          isSecondaryCr,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || "",
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

    return NextResponse.json({
      class: { id: classId, ...clsData },
      students,
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

    const db = getAdminDb();
    const clsSnap = await db.collection("classes").doc(classId).get();
    if (!clsSnap.exists) return NextResponse.json({ error: "Class not found." }, { status: 404 });
    const clsData = clsSnap.data()!;

    const isCr = clsData.crUid === user.uid;
    const userMemSnap = await db.collection("memberships").doc(`${classId}_${user.uid}`).get();
    const isTeacher = userMemSnap.exists && userMemSnap.data()?.role === "teacher" && userMemSnap.data()?.status === "approved";

    if (!isCr && !isTeacher) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // ACTION: Edit Student Details
    if (action === "edit_details") {
      const { studentUid, fullName, fatherName, seatNumber } = body;
      if (!studentUid || !fullName || !seatNumber) {
        return NextResponse.json({ error: "Student UID, full name, and seat number are required." }, { status: 400 });
      }

      const memRef = db.collection("memberships").doc(`${classId}_${studentUid}`);
      const memSnap = await memRef.get();
      if (!memSnap.exists || memSnap.data()?.status !== "approved") {
        return NextResponse.json({ error: "Student membership not found." }, { status: 404 });
      }

      // Check if seatNumber is already taken by another student
      const seatConflict = await db.collection("memberships")
        .where("classId", "==", classId)
        .where("status", "==", "approved")
        .get();
      const conflictDoc = seatConflict.docs.find(
        (d) => d.data().uid !== studentUid && String(d.data().seatNumber).toLowerCase() === String(seatNumber).trim().toLowerCase()
      );
      if (conflictDoc) {
        return NextResponse.json({ error: `Seat number ${seatNumber} is already used by another student.` }, { status: 409 });
      }

      await memRef.update({
        fullName: toTitleCase(String(fullName)),
        fatherName: toTitleCase(String(fatherName ?? "")),
        seatNumber: String(seatNumber).trim(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update studentRequests doc if exists
      const reqSnap = await db.collection("studentRequests")
        .where("classId", "==", classId)
        .where("studentUid", "==", studentUid)
        .limit(1)
        .get();
      if (!reqSnap.empty) {
        await reqSnap.docs[0].ref.update({
          fullName: toTitleCase(String(fullName)),
          fatherName: toTitleCase(String(fatherName ?? "")),
          seatNumber: String(seatNumber).trim(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Sync with Google Sheets if configured
      if (clsData.spreadsheetId) {
        try {
          const { syncAttendanceMatrix } = await import("@/lib/google");
          const activeSubjects = await db.collection("subjects").where("classId", "==", classId).where("active", "==", true).get();
          const allMembers = await db.collection("memberships").where("classId", "==", classId).where("role", "==", "student").where("status", "==", "approved").get();
          
          for (const sub of activeSubjects.docs) {
            const subData = sub.data();
            const attDocs = await db.collection("attendance").where("classId", "==", classId).where("subjectId", "==", sub.id).limit(5000).get();
            const dates = [...new Set(attDocs.docs.map((d) => String(d.data().date)))].sort();
            const byStudent = new Map<string, Record<string, unknown>>();
            attDocs.docs.forEach((d) => {
              const dData = d.data();
              byStudent.set(`${dData.studentUid}_${dData.date}`, dData);
            });

            const values = [
              [`${clsData.university ?? ""} · ${clsData.department ?? ""} · ${clsData.className ?? ""} · Section ${clsData.section ?? ""} · ${clsData.semester ?? ""}`],
              ["Seat number", "Student name", "Father name", ...dates, "Total"],
              ...allMembers.docs.sort((a, b) => String(a.data().seatNumber ?? "").localeCompare(String(b.data().seatNumber ?? ""), undefined, { numeric: true })).map((d) => {
                const s = d.data();
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

            await syncAttendanceMatrix(clsData.crUid, clsData.spreadsheetId, subData.name ?? "Attendance", values);
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

      const targetMemRef = db.collection("memberships").doc(`${classId}_${studentUid}`);
      const targetMemSnap = await targetMemRef.get();
      if (!targetMemSnap.exists || targetMemSnap.data()?.status !== "approved" || targetMemSnap.data()?.role !== "student") {
        return NextResponse.json({ error: "Selected user is not an approved student of this class." }, { status: 400 });
      }

      // If a different secondary CR was assigned, unset their flag
      const previousSecondaryUid = clsData.secondaryCrUid;
      if (previousSecondaryUid && previousSecondaryUid !== studentUid) {
        const prevMemRef = db.collection("memberships").doc(`${classId}_${previousSecondaryUid}`);
        const prevMemSnap = await prevMemRef.get();
        if (prevMemSnap.exists) {
          await prevMemRef.update({ isSecondaryCr: false, updatedAt: FieldValue.serverTimestamp() });
        }
      }

      await targetMemRef.update({ isSecondaryCr: true, updatedAt: FieldValue.serverTimestamp() });
      await db.collection("classes").doc(classId).update({
        secondaryCrUid: studentUid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ ok: true, message: "Student appointed as Secondary CR successfully." });
    }

    // ACTION: Revoke Secondary CR
    if (action === "revoke_secondary_cr") {
      const { studentUid } = body;
      if (!studentUid) return NextResponse.json({ error: "studentUid is required." }, { status: 400 });

      const targetMemRef = db.collection("memberships").doc(`${classId}_${studentUid}`);
      const targetMemSnap = await targetMemRef.get();
      if (targetMemSnap.exists) {
        await targetMemRef.update({ isSecondaryCr: false, updatedAt: FieldValue.serverTimestamp() });
      }

      if (clsData.secondaryCrUid === studentUid) {
        await db.collection("classes").doc(classId).update({
          secondaryCrUid: null,
          updatedAt: FieldValue.serverTimestamp(),
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

      // Check if seat is taken by someone else
      const seatUsers = await db.collection("memberships")
        .where("classId", "==", classId)
        .where("status", "==", "approved")
        .get();
      const conflict = seatUsers.docs.find(
        (d) => d.data().uid !== user.uid && String(d.data().seatNumber).toLowerCase() === String(seatNumber).trim().toLowerCase()
      );
      if (conflict) {
        return NextResponse.json({ error: `Seat number ${seatNumber} is already registered to another student.` }, { status: 409 });
      }

      const crUserSnap = await db.collection("users").doc(user.uid).get();
      const crUserData = crUserSnap.data() || {};
      const resolvedName = toTitleCase(fullName || crUserData.name || user.displayName || "Class Representative");
      const formattedFatherName = toTitleCase(fatherName);

      const crMemRef = db.collection("memberships").doc(`${classId}_${user.uid}`);
      await crMemRef.set({
        classId,
        uid: user.uid,
        role: "student",
        status: "approved",
        isPrimaryCr: true,
        isSecondaryCr: false,
        fullName: resolvedName,
        fatherName: formattedFatherName,
        seatNumber: String(seatNumber).trim(),
        email: crUserData.email || user.email || "",
        approvedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      // Add CR student row to Google Sheets if connected
      if (clsData.spreadsheetId) {
        try {
          const { addStudentToAttendanceTabs } = await import("@/lib/google");
          const activeSubjects = await db.collection("subjects").where("classId", "==", classId).where("active", "==", true).get();
          const tabNames = activeSubjects.docs.map((s) => String(s.data().name));
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
    const studentUid = url.searchParams.get("studentUid");

    if (!classId || !studentUid) {
      return NextResponse.json({ error: "classId and studentUid are required." }, { status: 400 });
    }

    const db = getAdminDb();
    const clsSnap = await db.collection("classes").doc(classId).get();
    if (!clsSnap.exists) return NextResponse.json({ error: "Class not found." }, { status: 404 });
    const clsData = clsSnap.data()!;

    const isCr = clsData.crUid === user.uid;
    const userMemSnap = await db.collection("memberships").doc(`${classId}_${user.uid}`).get();
    const isTeacher = userMemSnap.exists && userMemSnap.data()?.role === "teacher" && userMemSnap.data()?.status === "approved";

    if (!isCr && !isTeacher) {
      return NextResponse.json({ error: "Only the Class Representative or Teacher can remove a student." }, { status: 403 });
    }

    // Safety guard: Cannot delete the Primary CR workspace owner
    if (studentUid === clsData.crUid) {
      return NextResponse.json({ error: "The primary Class Representative workspace owner cannot be removed." }, { status: 403 });
    }

    const memRef = db.collection("memberships").doc(`${classId}_${studentUid}`);
    const memSnap = await memRef.get();
    if (!memSnap.exists) {
      return NextResponse.json({ error: "Student membership not found." }, { status: 404 });
    }

    // 1. Delete membership document
    await memRef.delete();

    // 2. Delete join request documents for this student in this class
    const reqSnap = await db.collection("studentRequests")
      .where("classId", "==", classId)
      .where("studentUid", "==", studentUid)
      .get();
    const batch = db.batch();
    reqSnap.docs.forEach((doc) => batch.delete(doc.ref));

    // 3. Clear secondaryCrUid if this student was the secondary CR
    if (clsData.secondaryCrUid === studentUid) {
      batch.update(db.collection("classes").doc(classId), {
        secondaryCrUid: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // 4. Batch delete ALL historical attendance records for this student in this class
    const attSnap = await db.collection("attendance")
      .where("classId", "==", classId)
      .where("studentUid", "==", studentUid)
      .get();
    attSnap.docs.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();

    // 5. Purge student from Google Sheets workbook across all subject tabs
    if (clsData.spreadsheetId) {
      try {
        const { syncAttendanceMatrix } = await import("@/lib/google");
        const activeSubjects = await db.collection("subjects").where("classId", "==", classId).where("active", "==", true).get();
        const remainingMembers = await db.collection("memberships")
          .where("classId", "==", classId)
          .where("role", "==", "student")
          .where("status", "==", "approved")
          .get();

        for (const sub of activeSubjects.docs) {
          const subData = sub.data();
          const attDocs = await db.collection("attendance")
            .where("classId", "==", classId)
            .where("subjectId", "==", sub.id)
            .limit(5000)
            .get();
          const dates = [...new Set(attDocs.docs.map((d) => String(d.data().date)))].sort();
          const byStudent = new Map<string, Record<string, unknown>>();
          attDocs.docs.forEach((d) => {
            const dData = d.data();
            byStudent.set(`${dData.studentUid}_${dData.date}`, dData);
          });

          const values = [
            [`${clsData.university ?? ""} · ${clsData.department ?? ""} · ${clsData.className ?? ""} · Section ${clsData.section ?? ""} · ${clsData.semester ?? ""}`],
            ["Seat number", "Student name", "Father name", ...dates, "Total"],
            ...remainingMembers.docs.sort((a, b) => String(a.data().seatNumber ?? "").localeCompare(String(b.data().seatNumber ?? ""), undefined, { numeric: true })).map((d) => {
              const s = d.data();
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

          await syncAttendanceMatrix(clsData.crUid, clsData.spreadsheetId, subData.name ?? "Attendance", values);
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
