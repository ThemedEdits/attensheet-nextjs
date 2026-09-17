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
export const joinClassSchema = z.object({
  classCode: z
    .string()
    .trim()
    .min(1, "Class code is required.")
    .toUpperCase()
    .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, "Class code must be in ABCD-1234 format."),
});
export const studentRequestSchema = joinClassSchema.extend({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(80, "Full name cannot exceed 80 characters."),
  fatherName: z
    .string()
    .trim()
    .min(2, "Father's name must be at least 2 characters.")
    .max(80, "Father's name cannot exceed 80 characters."),
  seatNumber: z
    .string()
    .trim()
    .min(1, "Seat number is required.")
    .max(12, "Seat number cannot exceed 12 characters.")
    .regex(/^[A-Za-z0-9-]{1,12}$/, "Seat number can only contain letters, numbers, and hyphens (e.g. BSCS-01)."),
});
