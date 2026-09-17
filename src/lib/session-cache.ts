"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";

export type Role = "cr" | "teacher" | "student";

export type UserProfile = {
  uid?: string;
  name?: string;
  role?: Role;
  email?: string;
};

export type SessionData = {
  profile: UserProfile | null;
  isSecondaryCr: boolean;
  pending: number;
};

const STORAGE_KEY = "attensheet_session";
const SESSION_EVENT = "attensheet_session_update";

export function getCachedSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SessionData;
      if (firebaseAuth.currentUser && parsed.profile?.uid && parsed.profile.uid !== firebaseAuth.currentUser.uid) {
        return null;
      }
      return parsed;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

export function setCachedSession(session: SessionData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    if (session.profile?.role) {
      localStorage.setItem("attensheet_role", session.profile.role);
    } else {
      localStorage.removeItem("attensheet_role");
    }
    localStorage.setItem("attensheet_secondary_cr", String(session.isSecondaryCr));
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: session }));
  } catch {
    // Ignore storage write errors
  }
}

export function clearCachedSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("attensheet_role");
    localStorage.removeItem("attensheet_secondary_cr");
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: null }));
  } catch {
    // Ignore storage errors
  }
}

export function updatePendingCount(pending: number): void {
  const current = getCachedSession();
  if (current) {
    setCachedSession({ ...current, pending });
  }
}

let inFlightFetch: Promise<SessionData | null> | null = null;

export async function fetchSessionData(): Promise<SessionData | null> {
  if (inFlightFetch) return inFlightFetch;

  inFlightFetch = (async () => {
    try {
      const headers = await authHeaders();
      const response = await fetch("/api/dashboard", { headers });
      const result = await readApiResponse(response);

      if (!response.ok || !result.profile) {
        return null;
      }

      const profile = result.profile as UserProfile;
      const isSecondaryCr = Boolean(result.isSecondaryCr);
      let pending = typeof result.pendingRequestsCount === "number" ? result.pendingRequestsCount : 0;

      if (profile.role === "cr" && typeof result.pendingRequestsCount !== "number") {
        try {
          const reqResponse = await fetch("/api/requests", { headers });
          const reqResult = await readApiResponse(reqResponse);
          if (reqResponse.ok && Array.isArray(reqResult.requests)) {
            pending = reqResult.requests.length;
          }
        } catch {
          // Non-blocking requests fetch error
        }
      }

      const session: SessionData = {
        profile: {
          ...profile,
          uid: firebaseAuth.currentUser?.uid || profile.uid,
        },
        isSecondaryCr,
        pending,
      };
      setCachedSession(session);
      return session;
    } catch {
      return null;
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}

export function useSession() {
  const [session, setSession] = useState<SessionData | null>(() => getCachedSession());
  const [loading, setLoading] = useState<boolean>(() => !getCachedSession());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SessionData | null>;
      setSession(customEvent.detail);
      if (customEvent.detail) {
        setLoading(false);
      }
    };

    window.addEventListener(SESSION_EVENT, handleUpdate);

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        clearCachedSession();
        setSession(null);
        setLoading(false);
        return;
      }

      // If cached session belongs to a different user, clear it immediately
      const currentCached = getCachedSession();
      if (currentCached?.profile?.uid && currentCached.profile.uid !== user.uid) {
        clearCachedSession();
        setSession(null);
      }

      // Revalidate in background without blocking UI
      const updated = await fetchSessionData();
      if (updated) {
        setSession(updated);
      }
      setLoading(false);
    });

    return () => {
      window.removeEventListener(SESSION_EVENT, handleUpdate);
      unsubscribe();
    };
  }, []);

  return { session, loading };
}
