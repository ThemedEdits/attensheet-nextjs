import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const required = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "TOKEN_ENCRYPTION_KEY",
  ];
  const missing = required.filter((name) => !process.env[name]);
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const privateKeyShape = key
    ? { hasBeginMarker: key.includes("BEGIN PRIVATE KEY"), hasEndMarker: key.includes("END PRIVATE KEY"), hasEscapedNewlines: key.includes("\\n"), length: key.length }
    : null;
  const ready = missing.length === 0;
  return NextResponse.json({
    ok: ready,
    missing,
    firebaseAdmin: ready ? "variables_present" : "variables_missing",
    privateKeyShape,
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? null,
  }, { status: ready ? 200 : 503 });
}
