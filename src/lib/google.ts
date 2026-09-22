import { google } from "googleapis";

export function createGoogleOAuthClient() {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
}
export const googleScopes = ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/spreadsheets"];

import { google as googleApi } from "googleapis";
import { decryptSecret } from "./token-crypto";
import { prisma } from "@/lib/prisma";

export async function getAuthorizedSheets(uid: string) {
  const googleToken = await prisma.googleToken.findUnique({ where: { uid } });
  const encrypted = googleToken?.refreshToken;
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
  await sheets.spreadsheets.values.update({ spreadsheetId, range: `'${tab}'!A1`, valueInputOption: "USER_ENTERED", requestBody: { values } });
}
export async function createAttendanceTab(uid: string, spreadsheetId: string, title: string, values?: string[][]) {
  const sheets = await getAuthorizedSheets(uid);
  const result = await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ addSheet: { properties: { title } } }] } });
  if (values?.length) await sheets.spreadsheets.values.update({ spreadsheetId, range: `'${title}'!A1`, valueInputOption: "USER_ENTERED", requestBody: { values } });
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
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `'${tab}'!A:ZZ` });
  await sheets.spreadsheets.values.update({ spreadsheetId, range: `'${tab}'!A1`, valueInputOption: "USER_ENTERED", requestBody: { values } });

  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === tab);
    const sheetId = sheet?.properties?.sheetId;
    if (sheet && sheetId !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requests: any[] = [];

      // Clear existing conditional format rules on this sheet to prevent duplicates
      const existingRules = sheet.conditionalFormats ?? [];
      for (let i = existingRules.length - 1; i >= 0; i--) {
        requests.push({
          deleteConditionalFormatRule: {
            sheetId,
            index: i,
          },
        });
      }

      const numColumns = values[1]?.length ?? 20;
      const endCol = Math.max(4, numColumns - 1);
      const range = {
        sheetId,
        startRowIndex: 2,
        endRowIndex: Math.max(3, values.length),
        startColumnIndex: 3,
        endColumnIndex: endCol,
      };

      // Rule for 1 (Present) -> Light Green (#D4EDDA)
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [range],
            booleanRule: {
              condition: {
                type: "TEXT_EQ",
                values: [{ userEnteredValue: "1" }],
              },
              format: {
                backgroundColor: { red: 0.83, green: 0.93, blue: 0.85 },
                textFormat: {
                  foregroundColor: { red: 0.09, green: 0.38, blue: 0.16 },
                  bold: true,
                },
              },
            },
          },
          index: 0,
        },
      });

      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [range],
            booleanRule: {
              condition: {
                type: "NUMBER_EQ",
                values: [{ userEnteredValue: "1" }],
              },
              format: {
                backgroundColor: { red: 0.83, green: 0.93, blue: 0.85 },
                textFormat: {
                  foregroundColor: { red: 0.09, green: 0.38, blue: 0.16 },
                  bold: true,
                },
              },
            },
          },
          index: 1,
        },
      });

      // Rule for 0 (Absent) -> Light Red (#F8D7DA)
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [range],
            booleanRule: {
              condition: {
                type: "TEXT_EQ",
                values: [{ userEnteredValue: "0" }],
              },
              format: {
                backgroundColor: { red: 0.97, green: 0.84, blue: 0.85 },
                textFormat: {
                  foregroundColor: { red: 0.55, green: 0.12, blue: 0.15 },
                  bold: true,
                },
              },
            },
          },
          index: 2,
        },
      });

      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [range],
            booleanRule: {
              condition: {
                type: "NUMBER_EQ",
                values: [{ userEnteredValue: "0" }],
              },
              format: {
                backgroundColor: { red: 0.97, green: 0.84, blue: 0.85 },
                textFormat: {
                  foregroundColor: { red: 0.55, green: 0.12, blue: 0.15 },
                  bold: true,
                },
              },
            },
          },
          index: 3,
        },
      });

      // Center-align attendance cells
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 1,
            endRowIndex: Math.max(2, values.length),
            startColumnIndex: 3,
            endColumnIndex: numColumns,
          },
          cell: {
            userEnteredFormat: {
              horizontalAlignment: "CENTER",
            },
          },
          fields: "userEnteredFormat.horizontalAlignment",
        },
      });

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    }
  } catch (err) {
    console.error("Failed to apply formatting to Google Sheet:", err);
  }
}

export async function addStudentToAttendanceTabs(uid: string, spreadsheetId: string, tabs: string[], student: { uid: string; fullName?: string; fatherName?: string; seatNumber?: string }) {
  const sheets = await getAuthorizedSheets(uid);
  for (const tab of tabs) {
    const current = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${tab}'!A:C` });
    const rows = current.data.values ?? [];
    const existingIndex = rows.findIndex((row) => String(row[0] ?? "") === student.uid || String(row[1] ?? "") === student.fullName);
    if (existingIndex >= 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${tab}'!A${existingIndex + 1}:C${existingIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[student.seatNumber ?? "", student.fullName ?? "", student.fatherName ?? ""]] },
      });
      continue;
    }
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${tab}'!A:C`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[student.seatNumber ?? "", student.fullName ?? "", student.fatherName ?? ""]] },
    });
  }
}
