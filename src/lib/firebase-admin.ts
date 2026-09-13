import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function cleanPrivateKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let key = value.trim();

  if (key.startsWith("{") && key.endsWith("}")) {
    try {
      const parsed = JSON.parse(key);
      if (typeof parsed === "string") {
        key = parsed;
      } else if (parsed && typeof parsed === "object") {
        key = (parsed.private_key || parsed.privateKey || Object.values(parsed)[0] || key) as string;
      }
    } catch {
      key = key.replace(/^\{+/, "").replace(/\}+$/, "").trim();
    }
  } else {
    key = key.replace(/^\{+/, "").replace(/\}+$/, "").trim();
  }

  key = key.replace(/^["'](.*)["']$/s, "$1").trim();
  key = key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
  return key;
}

function getAdminApp() {
  const clean = (value: string | undefined) => value?.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  const projectId = clean(process.env.FIREBASE_ADMIN_PROJECT_ID);
  const clientEmail = clean(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
  const privateKey = cleanPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
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
