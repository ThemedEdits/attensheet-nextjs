import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { classSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const user = await authenticated(request); if (!user) return unauthorized();
  const { classId, ...values } = await request.json().catch(() => ({}));
  const parsed = classSchema.safeParse(values);
  if (!classId || !parsed.success) return NextResponse.json({ error: parsed.success ? "Class ID is required." : parsed.error.issues[0]?.message }, { status: 400 });
  
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.crUid !== user.uid) return NextResponse.json({ error: "Only the class representative can edit this class." }, { status: 403 });
  
  await prisma.class.update({
    where: { id: classId },
    data: parsed.data
  });
  
  return NextResponse.json({ ok: true });
}
