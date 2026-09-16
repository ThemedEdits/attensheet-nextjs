/**
 * Converts any string into Title Case (e.g. "hammad ahmed" -> "Hammad Ahmed", "HAMMAD AHMED" -> "Hammad Ahmed").
 * Trims extraneous whitespace and properly capitalizes each word.
 */
export function toTitleCase(input?: string | null): string {
  if (!input) return "";
  return input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}
