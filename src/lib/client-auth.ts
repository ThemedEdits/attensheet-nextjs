import { firebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

function currentUser(): Promise<User> {
  if (firebaseAuth.currentUser) return Promise.resolve(firebaseAuth.currentUser);
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Your sign-in session has expired. Please sign in again."));
    }, 10000);
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      window.clearTimeout(timeout);
      unsubscribe();
      if (user) resolve(user);
      else reject(new Error("Your sign-in session has expired. Please sign in again."));
    });
  });
}

export async function authHeaders(json = false, forceRefresh = false): Promise<HeadersInit> {
  const user = await currentUser();
  const token = await user.getIdToken(forceRefresh);
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}
