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
    ];
    const missing = required.filter((name) => !process.env[name]?.trim());
    const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    return json({
      ok: missing.length === 0,
      deployment: "health-v3",
      missing,
      privateKeyShape: key ? {
        hasBeginMarker: key.includes("BEGIN PRIVATE KEY"),
        hasEndMarker: key.includes("END PRIVATE KEY"),
        hasEscapedNewlines: key.includes("\\n"),
        length: key.length,
      } : null,
      googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? null,
    }, missing.length === 0 ? 200 : 503);
  } catch (error) {
    console.error("Health endpoint failed", error);
    return json({ ok: false, deployment: "health-v3", error: "Health endpoint failed before diagnostics could complete." }, 500);
  }
}
