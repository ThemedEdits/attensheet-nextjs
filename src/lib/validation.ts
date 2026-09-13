import { z } from "zod";

export const roleSchema = z.enum(["cr", "teacher", "student"]);
export const profileSchema = z.object({ name: z.string().trim().min(2).max(80), role: roleSchema });
export const classSchema = z.object({
  university: z.string().trim().min(2).max(100),
  semester: z.string().trim().min(2).max(40),
  department: z.string().trim().min(2).max(100),
  batch: z.string().trim().min(4).max(12),
  className: z.string().trim().min(2).max(40),
  section: z.string().trim().min(1).max(10),
});
export const subjectSchema = z.object({ name: z.string().trim().min(2).max(100), teacherUid: z.string().optional() });
export const joinClassSchema = z.object({ classCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/) });
export const studentRequestSchema = joinClassSchema.extend({
  fullName: z.string().trim().min(2).max(80),
  fatherName: z.string().trim().min(2).max(80),
  seatNumber: z.string().trim().regex(/^[A-Za-z0-9-]{1,12}$/),
});
