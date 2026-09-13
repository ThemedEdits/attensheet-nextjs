import { NextResponse } from "next/server";
import { verifyBearerToken } from "./firebase-admin";
export async function authenticated(request: Request) {
  try { return await verifyBearerToken(request); } catch { return null; }
}
export function unauthorized() { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
