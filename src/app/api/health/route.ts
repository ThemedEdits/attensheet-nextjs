import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

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
  let adminStatus = "not_checked";
  let firestoreStatus = "not_checked";
  if (missing.length === 0) {
    try {
      getAdminAuth();
      adminStatus = "initialized";
      await getAdminDb().collection("classes").limit(1).get();
      firestoreStatus = "reachable";
    } catch (error) {
      adminStatus = error instanceof Error ? error.message : "initialization_failed";
      firestoreStatus = "unreachable";
      console.error("Health dependency check failed", error);
    }
  }
  const ready = missing.length === 0 && adminStatus === "initialized" && firestoreStatus === "reachable";
  return NextResponse.json({
    ok: ready,
    missing,
    firebaseAdmin: adminStatus,
    firestore: firestoreStatus,
    privateKeyShape,
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? null,
  }, { status: ready ? 200 : 503 });
}
