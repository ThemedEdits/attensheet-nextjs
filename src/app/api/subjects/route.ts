import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
export async function POST(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const { classId, name } = await request.json().catch(() => ({}));
  if (!classId || typeof name !== "string" || name.trim().length < 2) return NextResponse.json({ error: "A subject name is required." }, { status: 400 });
  const db = getAdminDb(); const cls = await db.collection("classes").doc(classId).get();
  if (cls.data()?.crUid !== user.uid) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const ref = db.collection("subjects").doc(); await ref.set({ classId, name: name.trim(), active: true, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return NextResponse.json({ id: ref.id }, { status: 201 });
}
