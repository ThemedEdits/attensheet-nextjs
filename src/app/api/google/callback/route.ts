import { NextRequest, NextResponse } from "next/server";
import { createGoogleOAuthClient } from "@/lib/google";
import { encryptSecret } from "@/lib/token-crypto";
import { addStudentToAttendanceTabs, createAttendanceSpreadsheet, removeDefaultBlankTabs } from "@/lib/google";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
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
        const createdSpreadsheet = await createAttendanceSpreadsheet(uid, title, activeSubjects.map((item) => String(item.name)));
        const spreadsheetId = createdSpreadsheet.spreadsheetId;
        if (!spreadsheetId) throw new Error("Google did not return a spreadsheet ID.");
        await removeDefaultBlankTabs(uid, spreadsheetId);
        
        await prisma.class.update({ where: { id: classId }, data: { spreadsheetId } });
        
        const students = await prisma.membership.findMany({ where: { classId, role: "student", status: "approved" } });
        const sortedStudents = students.sort((a, b) => String(a.seatNumber ?? "").localeCompare(String(b.seatNumber ?? "")));
        const { syncAttendanceMatrix } = await import("@/lib/google");

        for (const subject of activeSubjects) {
          const sheetInfo = createdSpreadsheet.sheets?.find(s => s.properties?.title === subject.name);
          const generatedSheetId = sheetInfo?.properties?.sheetId;
          if (generatedSheetId !== undefined) {
            await prisma.subject.update({
              where: { id: subject.id },
              data: { googleSheetTabId: String(generatedSheetId) }
            });
          }

          const attendance = await prisma.attendance.findMany({ where: { classId, subjectId: subject.id } });
          const dates = [...new Set(attendance.map((d) => String(d.date)))].sort();
          const byStudent = new Map<string, Record<string, unknown>>();
          attendance.forEach((d) => { byStudent.set(`${d.studentUid}_${d.date}`, d as unknown as Record<string, unknown>); });
          
          const values = [
            [`${cls.university ?? ""} · ${cls.department ?? ""} · ${cls.className ?? ""} · Section ${cls.section ?? ""} · ${cls.semester ?? ""}`],
            ["Seat number", "Student name", "Father name", ...dates, "Total"],
            ...sortedStudents.map((student) => {
              const statuses = dates.map((date) => (byStudent.get(`${student.uid}_${date}`) as any)?.present ? "1" : byStudent.has(`${student.uid}_${date}`) ? "0" : "");
              return [String(student.seatNumber ?? ""), String(student.fullName ?? ""), String(student.fatherName ?? ""), ...statuses, `${statuses.filter((status) => status === "1").length}/${statuses.filter(Boolean).length}`];
            }),
          ];
          
          await syncAttendanceMatrix(uid, spreadsheetId, subject.name, values, generatedSheetId ?? undefined);
        }
      }
    }
    const response = NextResponse.redirect(new URL("/dashboard?google=connected", request.url));
    response.cookies.delete("google_oauth_state");
    response.cookies.delete("google_oauth_uid");
    response.cookies.delete("google_oauth_class");
    return response;
  } catch (error: any) {
    console.error("Google OAuth callback failed:", error);
    return NextResponse.json({ error: error.message || "Internal server error during Google OAuth callback." }, { status: 500 });
  }
}
