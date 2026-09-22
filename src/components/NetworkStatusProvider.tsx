"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, CloudOff } from "lucide-react";

interface NetworkStatusContextType {
  isOnline: boolean;
  checkConnection: () => Promise<boolean>;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: true,
  checkConnection: async () => true,
});

export const useNetworkStatus = () => useContext(NetworkStatusContext);

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [mounted, setMounted] = useState(false);

  const performPing = async (): Promise<boolean> => {
    try {
      // Ping a static asset with a timestamp to bust cache
      const res = await fetch(`/favicon.ico?_ping=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const checkConnection = async (): Promise<boolean> => {
    setIsChecking(true);
    const online = await performPing();
    setIsChecking(false);
    setIsOnline(online);
    return online;
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = async () => {
        const reallyOnline = await performPing();
        if (reallyOnline) {
          setIsOnline(true);
          setShowRestoredNotice(true);
          const t = setTimeout(() => setShowRestoredNotice(false), 3500);
          return () => clearTimeout(t);
        }
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  return (
    <NetworkStatusContext.Provider value={{ isOnline, checkConnection }}>
      {children}

      {/* Online Restored Toast */}
      {showRestoredNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 rounded-full border border-emerald-500/40 bg-[#0B1813]/95 px-4 py-2 text-xs font-semibold text-emerald-400 shadow-xl shadow-emerald-950/50 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Connection restored. Attendance sync active.</span>
        </div>
      )}

      {/* Offline Fullscreen Overlay */}
      {mounted && !isOnline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07110d]/95 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          {/* Ambient background glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
            <div className="w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,rgba(239,98,98,0.12)_0%,transparent_70%)] animate-pulse" />
          </div>

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[#0D1C16] p-7 text-center shadow-2xl shadow-black/80">
            {/* Header Brand */}
            <div className="mb-6 flex items-center justify-center gap-2">
              <img
                src="/attensheetlogo.svg"
                alt="AttenSheet"
                className="h-6 w-auto object-contain opacity-90"
              />
              <span className="text-base font-bold text-[var(--text-primary)]">
                Atten<span className="text-[var(--accent)]">Sheet</span>
              </span>
            </div>

            {/* Offline Animated Icon */}
            <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-red-400 shadow-inner">
                <WifiOff className="h-8 w-8" />
              </div>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              No Internet Connection
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              AttenSheet requires an active network connection to securely authenticate, record attendance, and sync registers with your cloud database.
            </p>

            {/* Disconnected status pill */}
            <div className="my-5 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1 text-xs font-medium text-red-300">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span>Offline &bull; Sync Paused</span>
            </div>

            {/* Retry Button */}
            <button
              type="button"
              onClick={() => void checkConnection()}
              disabled={isChecking}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[#0D7A4D] py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
              <span>{isChecking ? "Testing connection..." : "Try Reconnecting"}</span>
            </button>

            {/* Troubleshooting tips */}
            <div className="mt-6 border-t border-[var(--border)] pt-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Troubleshooting
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-[var(--text-secondary)]">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  <span>Check Wi-Fi or mobile cellular data</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  <span>Ensure Airplane mode is turned off</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </NetworkStatusContext.Provider>
  );
}
