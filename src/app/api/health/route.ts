export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET() {
  try {
    const required = [
      "FIREBASE_ADMIN_PROJECT_ID",
      "FIREBASE_ADMIN_CLIENT_EMAIL",
      "FIREBASE_ADMIN_PRIVATE_KEY",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_REDIRECT_URI",
      "TOKEN_ENCRYPTION_KEY",
      "DATABASE_URL",
    ];
    const missing = required.filter((name) => !process.env[name]?.trim());
    const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    let admin: "not_checked" | "initialized" | "failed" = "not_checked";
    let database: "not_checked" | "reachable" | "failed" = "not_checked";
    let adminError: string | undefined;
    if (missing.length === 0) {
      try {
        const { getAdminAuth } = await import("@/lib/firebase-admin");
        getAdminAuth();
        admin = "initialized";
        const { prisma } = await import("@/lib/prisma");
        await prisma.class.findFirst();
        database = "reachable";
      } catch (error) {
        admin = "failed";
        database = "failed";
        adminError = error instanceof Error ? error.message : "Firebase Admin initialization failed.";
        console.error("Health Firebase Admin check failed", error);
      }
    }
    const ok = missing.length === 0 && admin === "initialized" && database === "reachable";
    return json({
      ok,
      deployment: "health-v3",
      missing,
      admin,
      database,
      ...(adminError ? { adminError } : {}),
      privateKeyShape: key ? {
        hasBeginMarker: key.includes("BEGIN PRIVATE KEY"),
        hasEndMarker: key.includes("END PRIVATE KEY"),
        hasEscapedNewlines: key.includes("\\n"),
        length: key.length,
      } : null,
      googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? null,
    }, ok ? 200 : 503);
  } catch (error) {
    console.error("Health endpoint failed", error);
    return json({ ok: false, deployment: "health-v3", error: "Health endpoint failed before diagnostics could complete." }, 500);
  }
}
