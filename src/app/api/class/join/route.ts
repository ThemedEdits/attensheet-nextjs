import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { joinClassSchema, studentRequestSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await authenticated(request); if (!user) return unauthorized();
    const [{ repositories }] = await Promise.all([
      import("@/lib/repositories"),
    ]);
    const body = await request.json().catch(() => ({}));
    const profile = await repositories.profile(user.uid);
    if (!profile || !["student", "teacher"].includes(String(profile.role))) return NextResponse.json({ error: "Only students and teachers can join." }, { status: 403 });
    const parsed = profile.role === "student" ? studentRequestSchema.safeParse(body) : joinClassSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    const cls = await repositories.classByCode(parsed.data.classCode);
    if (!cls) return NextResponse.json({ error: "Class not found." }, { status: 404 });
    
    const membership = await prisma.membership.findUnique({
      where: { classId_uid: { classId: cls.id, uid: user.uid } }
    });
    if (membership && membership.status === "approved") {
      return NextResponse.json({ error: "You are already approved for this class and cannot request it again." }, { status: 409 });
    }

    if (profile.role === "student") {
      const existingStudent = await prisma.studentRequest.findFirst({
        where: { uid: user.uid, classId: cls.id }
      });
      if (existingStudent) {
        if (["approved", "active"].includes(existingStudent.status)) return NextResponse.json({ error: "You are already approved for this class and cannot request it again." }, { status: 409 });
        if (existingStudent.status === "pending") return NextResponse.json({ error: "A request is already pending." }, { status: 409 });
      }
    } else {
      const existingTeacher = await prisma.teacherRequest.findFirst({
        where: { uid: user.uid, classId: cls.id }
      });
      if (existingTeacher) {
        if (["approved", "active"].includes(existingTeacher.status)) return NextResponse.json({ error: "You are already approved for this class and cannot request it again." }, { status: 409 });
        if (existingTeacher.status === "pending") return NextResponse.json({ error: "A request is already pending." }, { status: 409 });
      }
    }

    const values = parsed.data as Record<string, string>;
    if (profile.role === "student") {
      const seatUsers = await prisma.membership.findMany({
        where: { classId: cls.id, status: "approved", uid: { not: user.uid } }
      });
      const seatTaken = seatUsers.some(item => item.seatNumber?.toLowerCase() === values.seatNumber.toLowerCase());
      
      const pendingRequests = await prisma.studentRequest.findMany({
        where: { classId: cls.id, status: "pending" }
      });
      const seatPending = pendingRequests.some(item => item.seatNumber?.toLowerCase() === values.seatNumber.toLowerCase());
      
      if (seatTaken || seatPending) return NextResponse.json({ error: "That seat number is already in use or awaiting approval." }, { status: 409 });
    }

    const { toTitleCase } = await import("@/lib/title-case");
    const crypto = await import("crypto");
    const id = crypto.randomUUID();
    
    if (profile.role === "student") {
      await prisma.studentRequest.create({
        data: {
          id,
          classId: cls.id,
          uid: user.uid,
          fullName: toTitleCase(typeof values.fullName === "string" ? values.fullName : ""),
          fatherName: toTitleCase(typeof values.fatherName === "string" ? values.fatherName : ""),
          seatNumber: String(values.seatNumber ?? "").trim(),
          status: "pending",
          email: profile.email
        }
      });
    } else {
      await prisma.teacherRequest.create({
        data: {
          id,
          classId: cls.id,
          uid: user.uid,
          displayName: toTitleCase(typeof profile.displayName === "string" ? profile.displayName : ""),
          email: profile.email,
          status: "pending"
        }
      });
    }

    const crUid = typeof cls.crUid === "string" ? cls.crUid : String(cls.crUid ?? "");
    const crSnap = crUid ? await prisma.user.findUnique({ where: { uid: crUid } }) : null;
    
    return NextResponse.json(
      {
        id,
        status: "pending",
        pendingRequest: {
          id,
          classId: cls.id,
          className: cls.className || "Class",
          department: cls.department || "",
          university: cls.university || "",
          section: cls.section || "",
          semester: cls.semester || "",
          classCode: String(cls.classCode),
          crName: crSnap?.displayName || "Class Representative",
          seatNumber: values.seatNumber || "",
          fullName: toTitleCase(
            typeof values.fullName === "string"
              ? values.fullName
              : typeof profile.displayName === "string"
              ? profile.displayName
              : ""
          ),
          fatherName: toTitleCase(typeof values.fatherName === "string" ? values.fatherName : ""),
          status: "pending",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Class join failed", error);
    return NextResponse.json({ error: "Unable to process class join request. Please try again." }, { status: 500 });
  }
}
