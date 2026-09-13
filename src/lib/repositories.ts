import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";

export const repositories = {
  async profile(uid: string) {
    const snap = await getAdminDb().collection("users").doc(uid).get();
    return snap.exists ? ({ uid: snap.id, ...snap.data() } as Record<string, unknown> & { uid: string }) : null;
  },
  async classByCode(code: string) {
    const snap = await getAdminDb().collection("classes").where("classCode", "==", code.toUpperCase()).limit(1).get();
    return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Record<string, unknown> & { id: string });
  },
  async classForUser(uid: string) {
    const db = getAdminDb();
    const own = await db.collection("classes").where("crUid", "==", uid).limit(1).get();
    if (!own.empty) return ({ id: own.docs[0].id, ...own.docs[0].data() } as Record<string, unknown> & { id: string });
    const membership = await db.collection("memberships").where("uid", "==", uid).where("status", "==", "approved").limit(1).get();
    if (membership.empty) return null;
    const id = membership.docs[0].data().classId;
    const cls = await db.collection("classes").doc(id).get();
    return cls.exists ? ({ id: cls.id, ...cls.data() } as Record<string, unknown> & { id: string }) : null;
  },
  async createRequest(kind: "studentRequests" | "teacherRequests", data: Record<string, unknown>) {
    const ref = getAdminDb().collection(kind).doc();
    await ref.set({ ...data, status: "pending", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return ref.id;
  },
};
