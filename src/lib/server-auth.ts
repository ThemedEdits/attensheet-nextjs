import { NextResponse } from "next/server";
import { verifyBearerToken } from "./firebase-admin";
export async function authenticated(request: Request) {
  try { return await verifyBearerToken(request); } catch (error) {
    console.error("API authentication failed", error instanceof Error ? error.message : error);
    return null;
  }
}
export function unauthorized() { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
