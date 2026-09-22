import { NextRequest, NextResponse } from "next/server";
import { createGoogleOAuthClient } from "@/lib/google";
import { encryptSecret } from "@/lib/token-crypto";
import { addStudentToAttendanceTabs, createAttendanceSpreadsheet, removeDefaultBlankTabs } from "@/lib/google";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = new URL(request.url); const state = url.searchParams.get("state"); const code = url.searchParams.get("code");
  if (!code || state !== request.cookies.get("google_oauth_state")?.value) return NextResponse.json({ error: "Invalid OAuth state." }, { status: 400 });
  const client = createGoogleOAuthClient(); const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) return NextResponse.json({ error: "Google did not return a refresh token. Re-authorize access." }, { status: 400 });
  const uid = request.cookies.get("google_oauth_uid")?.value;
  if (!uid) return NextResponse.json({ error: "OAuth session expired. Please try again." }, { status: 400 });
  
  const encryptedRefreshToken = encryptSecret(tokens.refresh_token);
  await prisma.googleToken.upsert({
    where: { uid },
    update: { refreshToken: encryptedRefreshToken },
    create: { uid, refreshToken: encryptedRefreshToken },
  });
  const classId = request.cookies.get("google_oauth_class")?.value;
  if (classId) {
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (cls && cls.crUid === uid) {
      const title = `Attensheet - ${cls.university} - ${cls.department} - ${cls.className} - ${cls.section} - ${cls.semester}`;
      const subjects = await prisma.subject.findMany({ where: { classId } });
      const activeSubjects = subjects.filter(s => s.active);
      const spreadsheetId = await createAttendanceSpreadsheet(uid, title, activeSubjects.map((item) => String(item.name)));
      if (!spreadsheetId) throw new Error("Google did not return a spreadsheet ID.");
      await removeDefaultBlankTabs(uid, spreadsheetId);
      
      await prisma.class.update({ where: { id: classId }, data: { spreadsheetId } });
      
      const students = await prisma.membership.findMany({ where: { classId, role: "student", status: "approved" } });
      for (const subject of activeSubjects) {
        for (const student of students) {
          await addStudentToAttendanceTabs(uid, spreadsheetId, [String(subject.name)], { uid: String(student.uid), fullName: student.fullName ?? undefined, fatherName: student.fatherName ?? undefined, seatNumber: student.seatNumber ?? undefined });
        }
      }
    }
  }
  const response = NextResponse.redirect(new URL("/dashboard?google=connected", request.url));
  response.cookies.delete("google_oauth_state");
  response.cookies.delete("google_oauth_uid");
  response.cookies.delete("google_oauth_class");
  return response;
}
