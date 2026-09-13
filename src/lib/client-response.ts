export async function readApiResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return { error: `Server returned an empty response (HTTP ${response.status}).` };
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" ? value as Record<string, unknown> : { error: text };
  } catch {
    return { error: `Server returned a non-JSON response (HTTP ${response.status}).` };
  }
}
