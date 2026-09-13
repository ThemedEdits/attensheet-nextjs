export type Role = "cr" | "teacher" | "student";
export type RequestStatus = "pending" | "approved" | "rejected";

export interface UserProfile {
  uid: string; email: string; name: string; photoURL?: string; role?: Role;
  profileCompleted: boolean; createdAt: string; updatedAt: string;
}
export interface ClassRecord {
  id: string; classCode: string; crUid: string; university: string; semester: string;
  department: string; batch: string; className: string; section: string;
  spreadsheetId?: string; createdAt: string; updatedAt: string;
}
export interface SubjectRecord {
  id: string; classId: string; name: string; teacherUid?: string;
  googleSheetTabId?: number; active: boolean; createdAt: string; updatedAt: string;
}
export interface AttendanceSummary { total: number; present: number; absent: number; percentage: number; }

export function attendancePercentage(present: number, total: number) {
  return total === 0 ? 0 : Math.round((present / total) * 100);
}
