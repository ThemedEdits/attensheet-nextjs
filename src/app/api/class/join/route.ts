import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { joinClassSchema, studentRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await authenticated(request); if (!user) return unauthorized();
    const [{ getAdminDb }, { repositories }] = await Promise.all([
      import("@/lib/firebase-admin"),
      import("@/lib/repositories"),
    ]);
    const body = await request.json().catch(() => ({}));
    const profile = await repositories.profile(user.uid);
    if (!profile || !["student", "teacher"].includes(String(profile.role))) return NextResponse.json({ error: "Only students and teachers can join." }, { status: 403 });
    const parsed = profile.role === "student" ? studentRequestSchema.safeParse(body) : joinClassSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    const cls = await repositories.classByCode(parsed.data.classCode);
    if (!cls) return NextResponse.json({ error: "Class not found." }, { status: 404 });
    const db = getAdminDb();
    const collection = profile.role === "student" ? "studentRequests" : "teacherRequests";
    const identityField = profile.role === "student" ? "studentUid" : "teacherUid";
    // Keep the query single-field so a new Firebase project does not require
    // a manually-created composite index before joining works.
    const existing = await db.collection(collection).where(identityField, "==", user.uid).limit(20).get();
    const membership = await db.collection("memberships").doc(`${cls.id}_${user.uid}`).get();
    if (membership.exists && membership.data()?.status === "approved") {
      return NextResponse.json({ error: "You are already approved for this class and cannot request it again." }, { status: 409 });
    }
    if (existing.docs.some((item) => item.data().classId === cls.id && ["approved", "active"].includes(String(item.data().status)))) {
      return NextResponse.json({ error: "You are already approved for this class and cannot request it again." }, { status: 409 });
    }
    if (existing.docs.some((item) => item.data().classId === cls.id && item.data().status === "pending")) {
      return NextResponse.json({ error: "A request is already pending." }, { status: 409 });
    }
    const values = parsed.data as Record<string, string>;
    if (profile.role === "student") {
      const seatUsers = await db.collection("memberships").where("classId", "==", cls.id).limit(500).get();
      const seatTaken = seatUsers.docs.some((item) => item.data().status === "approved" && String(item.data().seatNumber).toLowerCase() === values.seatNumber.toLowerCase() && item.data().uid !== user.uid);
      const seatPending = existing.docs.some((item) => item.data().classId === cls.id && item.data().status === "pending" && String(item.data().seatNumber).toLowerCase() === values.seatNumber.toLowerCase());
      if (seatTaken || seatPending) return NextResponse.json({ error: "That seat number is already in use or awaiting approval." }, { status: 409 });
    }
    const id = await repositories.createRequest(collection, { classId: cls.id, classCode: String(cls.classCode), ...(profile.role === "student" ? { studentUid: user.uid, fullName: values.fullName, fatherName: values.fatherName, seatNumber: values.seatNumber } : { teacherUid: user.uid, fullName: profile.name, email: profile.email }) });
    return NextResponse.json({ id, status: "pending" }, { status: 201 });
  } catch (error) {
    console.error("Class join failed", error);
    return NextResponse.json({ error: "Unable to process class join request. Please try again." }, { status: 500 });
  }
}
