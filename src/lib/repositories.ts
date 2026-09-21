import { prisma } from "./prisma";
import { v4 as uuidv4 } from "uuid";

export const repositories = {
  async profile(uid: string) {
    const user = await prisma.user.findUnique({ where: { uid } });
    return user ? { ...user } : null;
  },
  async classByCode(code: string) {
    const cls = await prisma.class.findUnique({ where: { classCode: code.toUpperCase() } });
    return cls ? { ...cls } : null;
  },
  async classForUser(uid: string) {
    const own = await prisma.class.findFirst({ where: { crUid: uid } });
    if (own) return own;
    const membership = await prisma.membership.findFirst({
      where: { uid, status: "approved" },
    });
    if (!membership) return null;
    const cls = await prisma.class.findUnique({ where: { id: membership.classId } });
    return cls ? { ...cls } : null;
  },
  async createRequest(kind: "studentRequests" | "teacherRequests", data: any) {
    if (kind === "studentRequests") {
      const req = await prisma.studentRequest.create({
        data: {
          ...data,
          status: "pending",
        }
      });
      return req.id;
    } else {
      const req = await prisma.teacherRequest.create({
        data: {
          ...data,
          status: "pending",
        }
      });
      return req.id;
    }
  },
};
