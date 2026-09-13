import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function getAdminDb() {
  const adminApp = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
  return getFirestore(adminApp);
}

export async function verifyBearerToken(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Authentication required.");
  const { getAuth } = await import("firebase-admin/auth");
  getAdminDb(); // Ensure the default Admin app exists before resolving Auth.
  return getAuth().verifyIdToken(token);
}
