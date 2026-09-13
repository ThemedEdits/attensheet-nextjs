import { NextResponse } from "next/server";
export async function authenticated(request: Request) {
  try {
    const { verifyBearerToken } = await import("./firebase-admin");
    return await verifyBearerToken(request);
  } catch (error) {
    console.error("API authentication failed", error instanceof Error ? error.message : error);
    return null;
  }
}
export function unauthorized() { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
