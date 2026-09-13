import { NextRequest, NextResponse } from "next/server";
import { createGoogleOAuthClient } from "@/lib/google";
import { getAdminDb } from "@/lib/firebase-admin";
import { encryptSecret } from "@/lib/token-crypto";
import { addStudentToAttendanceTabs, createAttendanceSpreadsheet } from "@/lib/google";

export async function GET(request: NextRequest) {
  const url = new URL(request.url); const state = url.searchParams.get("state"); const code = url.searchParams.get("code");
  if (!code || state !== request.cookies.get("google_oauth_state")?.value) return NextResponse.json({ error: "Invalid OAuth state." }, { status: 400 });
  const client = createGoogleOAuthClient(); const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) return NextResponse.json({ error: "Google did not return a refresh token. Re-authorize access." }, { status: 400 });
  const uid = request.cookies.get("google_oauth_uid")?.value;
  if (!uid) return NextResponse.json({ error: "OAuth session expired. Please try again." }, { status: 400 });
  await getAdminDb().collection("googleTokens").doc(uid).set({ refreshToken: encryptSecret(tokens.refresh_token), updatedAt: new Date() }, { merge: true });
  const classId = request.cookies.get("google_oauth_class")?.value;
  if (classId) {
    const classRef = getAdminDb().collection("classes").doc(classId);
    const classSnapshot = await classRef.get();
    if (classSnapshot.exists && classSnapshot.data()?.crUid === uid) {
      const data = classSnapshot.data() ?? {};
      const title = `Attensheet - ${data.university} - ${data.department} - ${data.className} - ${data.section} - ${data.semester}`;
      const subjects = await getAdminDb().collection("subjects").where("classId", "==", classId).get();
      const spreadsheetId = await createAttendanceSpreadsheet(uid, title, subjects.docs.filter((item) => item.data().active === true).map((item) => String(item.data().name)));
      if (!spreadsheetId) throw new Error("Google did not return a spreadsheet ID.");
      await classRef.update({ spreadsheetId, updatedAt: new Date() });
      const students = await getAdminDb().collection("memberships").where("classId", "==", classId).limit(500).get();
      for (const subject of subjects.docs.filter((item) => item.data().active === true)) {
        for (const student of students.docs.filter((item) => item.data().role === "student" && item.data().status === "approved")) {
          const studentData = student.data();
          await addStudentToAttendanceTabs(uid, spreadsheetId, [String(subject.data().name)], { uid: String(studentData.uid), fullName: studentData.fullName, seatNumber: studentData.seatNumber });
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
