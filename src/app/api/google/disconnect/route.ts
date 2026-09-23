import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await authenticated(request); 
  if (!user) return unauthorized();
  
  const { classId } = await request.json().catch(() => ({}));
  if (!classId) return NextResponse.json({ error: "Class ID is required." }, { status: 400 });
  
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.crUid !== user.uid) return NextResponse.json({ error: "Only the class representative can manage sheets." }, { status: 403 });
  
  await prisma.class.update({
    where: { id: classId },
    data: { spreadsheetId: null }
  });
  
  return NextResponse.json({ ok: true });
}
