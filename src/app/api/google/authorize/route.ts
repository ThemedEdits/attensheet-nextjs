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

async function createAuthorization(request: Request, classId: string | null) {
  const state = randomBytes(24).toString("hex");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const user = await adminAuth().verifyIdToken(token);
  const client = createGoogleOAuthClient();
  const url = client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: googleScopes, state });
  const response = NextResponse.redirect(url);
  response.cookies.set("google_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  response.cookies.set("google_oauth_uid", user.uid, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  if (classId) response.cookies.set("google_oauth_class", classId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return createAuthorization(request, url.searchParams.get("classId"));
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const body = await request.json().catch(() => ({}));
    if (!token || typeof body.classId !== "string") return NextResponse.json({ error: "Authentication and class are required." }, { status: 400 });
    const user = await adminAuth().verifyIdToken(token);
    const cls = await (await import("@/lib/firebase-admin")).getAdminDb().collection("classes").doc(body.classId).get();
    if (!cls.exists || cls.data()?.crUid !== user.uid) return NextResponse.json({ error: "Only the class representative can connect Sheets." }, { status: 403 });
    const state = randomBytes(24).toString("hex");
    const client = createGoogleOAuthClient();
    const authUrl = client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: googleScopes, state });
    const response = NextResponse.json({ url: authUrl });
    response.cookies.set("google_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
    response.cookies.set("google_oauth_uid", user.uid, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
    response.cookies.set("google_oauth_class", body.classId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
    return response;
  } catch (error) {
    console.error("Google authorization setup failed", error);
    return NextResponse.json({ error: "Server OAuth configuration is incomplete. Check Firebase Admin and Google OAuth environment variables." }, { status: 500 });
  }
}
