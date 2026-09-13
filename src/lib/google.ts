import { google } from "googleapis";

export function createGoogleOAuthClient() {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
}
export const googleScopes = ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/spreadsheets"];

import { google as googleApi } from "googleapis";
import { decryptSecret } from "./token-crypto";
import { getAdminDb } from "./firebase-admin";
export async function getAuthorizedSheets(uid: string) {
  const snap = await getAdminDb().collection("googleTokens").doc(uid).get();
  const encrypted = snap.data()?.refreshToken;
  if (!encrypted) throw new Error("Google Sheets is not connected.");
  const client = createGoogleOAuthClient();
  client.setCredentials({ refresh_token: decryptSecret(encrypted) });
  return googleApi.sheets({ version: "v4", auth: client });
}
export async function createAttendanceSpreadsheet(uid: string, title: string, subjects: string[]) {
  const sheets = await getAuthorizedSheets(uid);
  const created = await sheets.spreadsheets.create({ requestBody: { properties: { title }, sheets: subjects.map((name) => ({ properties: { title: name } })) } });
  return created.data.spreadsheetId;
}
export async function syncAttendanceTab(uid: string, spreadsheetId: string, tab: string, values: string[][]) {
  const sheets = await getAuthorizedSheets(uid);
  await sheets.spreadsheets.values.update({ spreadsheetId, range: `${tab}!A1`, valueInputOption: "USER_ENTERED", requestBody: { values } });
}
export async function createAttendanceTab(uid: string, spreadsheetId: string, title: string, values?: string[][]) {
  const sheets = await getAuthorizedSheets(uid);
  const result = await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ addSheet: { properties: { title } } }] } });
  if (values?.length) await sheets.spreadsheets.values.update({ spreadsheetId, range: `${title}!A1`, valueInputOption: "USER_ENTERED", requestBody: { values } });
  return result.data.replies?.[0]?.addSheet?.properties?.sheetId;
}

export async function renameAttendanceTab(uid: string, spreadsheetId: string, sheetId: number, title: string) {
  const sheets = await getAuthorizedSheets(uid);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ updateSheetProperties: { properties: { sheetId, title }, fields: "title" } }] } });
}

export async function deleteAttendanceTab(uid: string, spreadsheetId: string, sheetId: number) {
  const sheets = await getAuthorizedSheets(uid);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ deleteSheet: { sheetId } }] } });
}

export async function removeDefaultBlankTabs(uid: string, spreadsheetId: string) {
  const sheets = await getAuthorizedSheets(uid);
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const tabs = spreadsheet.data.sheets ?? [];
  const deletions = tabs.filter((tab) => tab.properties?.title === "Sheet1" && tabs.length > 1 && tab.properties?.sheetId !== undefined).map((tab) => ({ deleteSheet: { sheetId: tab.properties!.sheetId! } }));
  if (deletions.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: deletions } });
}

export async function syncAttendanceMatrix(uid: string, spreadsheetId: string, tab: string, values: string[][]) {
  const sheets = await getAuthorizedSheets(uid);
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${tab}!A:ZZ` });
  await sheets.spreadsheets.values.update({ spreadsheetId, range: `${tab}!A1`, valueInputOption: "USER_ENTERED", requestBody: { values } });
}

export async function addStudentToAttendanceTabs(uid: string, spreadsheetId: string, tabs: string[], student: { uid: string; fullName?: string; fatherName?: string; seatNumber?: string }) {
  const sheets = await getAuthorizedSheets(uid);
  for (const tab of tabs) {
    const current = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A:C` });
    const rows = current.data.values ?? [];
    const existingIndex = rows.findIndex((row) => String(row[0] ?? "") === student.uid || String(row[1] ?? "") === student.fullName);
    if (existingIndex >= 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tab}!A${existingIndex + 1}:C${existingIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[student.seatNumber ?? "", student.fullName ?? "", student.fatherName ?? ""]] },
      });
      continue;
    }
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tab}!A:C`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[student.seatNumber ?? "", student.fullName ?? "", student.fatherName ?? ""]] },
    });
  }
}
