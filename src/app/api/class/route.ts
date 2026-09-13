import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { classSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const { classId, ...values } = await request.json().catch(() => ({}));
  const parsed = classSchema.safeParse(values);
  if (!classId || !parsed.success) return NextResponse.json({ error: parsed.success ? "Class ID is required." : parsed.error.issues[0]?.message }, { status: 400 });
  const db = getAdminDb(); const ref = db.collection("classes").doc(classId); const snap = await ref.get();
  if (!snap.exists || snap.data()?.crUid !== user.uid) return NextResponse.json({ error: "Only the class representative can edit this class." }, { status: 403 });
  await ref.update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp() });
  return NextResponse.json({ ok: true });
}
