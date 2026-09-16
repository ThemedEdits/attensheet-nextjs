export type Role = "cr" | "teacher" | "student";
export type RequestStatus = "pending" | "approved" | "rejected";
export type MembershipStatus = "approved" | "revoked";

export interface UserProfile {
  uid: string; email: string; name: string; photoURL?: string; role?: Role;
  profileCompleted: boolean; createdAt: string; updatedAt: string;
}
export interface ClassRecord {
  id: string; classCode: string; crUid: string; secondaryCrUid?: string | null; university: string; semester: string;
  department: string; batch: string; className: string; section: string;
  spreadsheetId?: string; createdAt: string; updatedAt: string;
}
export interface SubjectRecord {
  id: string; classId: string; name: string; teacherUid?: string; teacherName?: string;
  googleSheetTabId?: number; active: boolean; createdAt: string; updatedAt: string;
}
export interface MembershipRecord {
  id: string; classId: string; uid: string; role: Role; status: MembershipStatus;
  fullName?: string; fatherName?: string; seatNumber?: string; email?: string;
  isSecondaryCr?: boolean; isPrimaryCr?: boolean; createdAt: string; updatedAt: string;
}
export interface JoinRequest { id: string; classId: string; studentUid?: string; teacherUid?: string; status: RequestStatus; fullName?: string; fatherName?: string; seatNumber?: string; createdAt: string; updatedAt: string; }
export interface AttendanceRecord { id: string; classId: string; subjectId: string; studentUid: string; date: string; present: boolean; markedBy: string; updatedAt: string; }
export interface AttendanceSummary { total: number; present: number; absent: number; percentage: number; }

export function attendancePercentage(present: number, total: number) {
  return total === 0 ? 0 : Math.round((present / total) * 100);
}

/** Karachi calendar date, deliberately independent of the server's timezone. */
export function karachiDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function attendanceDateIsLocked(date: string, now = new Date()) {
  return date < karachiDate(now);
}
