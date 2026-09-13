import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

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
  let firebaseAdmin = "not_checked";
  if (!missing.includes("FIREBASE_ADMIN_PROJECT_ID") && !missing.includes("FIREBASE_ADMIN_CLIENT_EMAIL") && !missing.includes("FIREBASE_ADMIN_PRIVATE_KEY")) {
    try {
      getAdminAuth();
      firebaseAdmin = "ready";
    } catch (error) {
      firebaseAdmin = "invalid_configuration";
      console.error("Health check Firebase Admin initialization failed", error);
    }
  }
  try {
    const ready = missing.length === 0 && firebaseAdmin === "ready";
    return NextResponse.json({
      ok: ready,
      missing,
      firebaseAdmin,
      googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? null,
    }, { status: ready ? 200 : 503 });
  } catch (error) {
    console.error("Health response failed", error);
    return new Response("Attensheet health check failed.", { status: 500 });
  }
}
