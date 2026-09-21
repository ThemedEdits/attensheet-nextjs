import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { generateClassCode } from "@/lib/class-code";
import { v4 as uuidv4 } from "uuid";
import { toTitleCase } from "@/lib/title-case";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    const decoded = await getAdminAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const data = await req.json();
    const { form, addSelfAsStudent, selfSeatNumber, selfFatherName, userEmail, userDisplayName } = data;

    const existingClass = await prisma.class.findFirst({
      where: { crUid: uid },
    });

    if (existingClass) {
      return NextResponse.json({ error: "You already have an active class workspace." }, { status: 400 });
    }

    const classId = uuidv4();
    const classCode = generateClassCode();

    await prisma.$transaction(async (tx) => {
      await tx.class.create({
        data: {
          id: classId,
          crUid: uid,
          classCode,
          university: form.university,
          department: form.department,
          className: form.className,
          section: form.section,
          semester: form.semester,
        },
      });

      if (addSelfAsStudent && selfSeatNumber?.trim()) {
        await tx.membership.create({
          data: {
            id: `${classId}_${uid}`,
            classId,
            uid,
            role: "student",
            status: "approved",
            isSecondaryCr: false,
            fullName: toTitleCase(userDisplayName || "Class Representative"),
            seatNumber: selfSeatNumber.trim(),
            fatherName: toTitleCase(selfFatherName || ""),
          },
        });
      }
    });

    return NextResponse.json({ success: true, classId });
  } catch (error: any) {
    console.error("Error setting up class:", error);
    return NextResponse.json({ error: error.message || "Failed to setup class" }, { status: 500 });
  }
}
