import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function getAdminApp() {
  const clean = (value: string | undefined) => value?.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  const projectId = clean(process.env.FIREBASE_ADMIN_PROJECT_ID);
  const clientEmail = clean(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
  const privateKey = clean(process.env.FIREBASE_ADMIN_PRIVATE_KEY)?.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) throw new Error("Firebase Admin environment variables are missing.");
  return getApps()[0] ?? initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export async function verifyBearerToken(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Authentication required.");
  return getAdminAuth().verifyIdToken(token);
}
