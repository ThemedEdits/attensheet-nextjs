import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { repositories } from "@/lib/repositories";
import { joinClassSchema, studentRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const profile = await repositories.profile(user.uid);
  if (!profile || !["student", "teacher"].includes(String(profile.role))) return NextResponse.json({ error: "Only students and teachers can join." }, { status: 403 });
  const parsed = profile.role === "student" ? studentRequestSchema.safeParse(body) : joinClassSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  const cls = await repositories.classByCode(parsed.data.classCode);
  if (!cls) return NextResponse.json({ error: "Class not found." }, { status: 404 });
  const db = getAdminDb(); const collection = profile.role === "student" ? "studentRequests" : "teacherRequests";
  const existing = await db.collection(collection).where(profile.role === "student" ? "studentUid" : "teacherUid", "==", user.uid).where("classId", "==", cls.id).where("status", "==", "pending").limit(1).get();
  if (!existing.empty) return NextResponse.json({ error: "A request is already pending." }, { status: 409 });
  const values = parsed.data as Record<string, string>;
  const id = await repositories.createRequest(collection, { classId: cls.id, classCode: String(cls.classCode), ...(profile.role === "student" ? { studentUid: user.uid, fullName: values.fullName, fatherName: values.fatherName, seatNumber: values.seatNumber } : { teacherUid: user.uid }) });
  return NextResponse.json({ id, status: "pending" }, { status: 201 });
}
