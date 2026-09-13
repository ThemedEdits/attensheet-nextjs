import { NextResponse } from "next/server";
import { createGoogleOAuthClient, googleScopes } from "@/lib/google";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

async function createAuthorization(request: Request, classId: string | null) {
  const state = randomBytes(24).toString("hex");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { getAdminAuth } = await import("@/lib/firebase-admin");
  const user = await getAdminAuth().verifyIdToken(token);
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
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      return NextResponse.json({ error: "Google OAuth environment variables are missing on this deployment." }, { status: 503 });
    }
    const { getAdminAuth, getAdminDb } = await import("@/lib/firebase-admin");
    const user = await getAdminAuth().verifyIdToken(token);
    const cls = await getAdminDb().collection("classes").doc(body.classId).get();
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
    const detail = error instanceof Error ? error.message : "unknown server error";
    return NextResponse.json({ error: `Google authorization failed: ${detail}` }, { status: 500 });
  }
}
