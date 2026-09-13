import { firebaseAuth } from "@/lib/firebase";

export async function authHeaders(json = false): Promise<HeadersInit> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Your sign-in session has expired. Please sign in again.");
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}
