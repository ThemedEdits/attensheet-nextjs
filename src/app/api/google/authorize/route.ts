import { NextResponse } from "next/server";
import { createGoogleOAuthClient, googleScopes } from "@/lib/google";
import { randomBytes } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getApps } from "firebase-admin/app";
import { initializeApp, cert } from "firebase-admin/app";

function adminAuth() {
  const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId: process.env.FIREBASE_ADMIN_PROJECT_ID, clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL, privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n") }) });
  return getAuth(app);
}

export async function GET(request: Request) {
  const state = randomBytes(24).toString("hex");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const user = await adminAuth().verifyIdToken(token);
  const client = createGoogleOAuthClient();
  const url = client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: googleScopes, state });
  const response = NextResponse.redirect(url);
  response.cookies.set("google_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  response.cookies.set("google_oauth_uid", user.uid, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}
