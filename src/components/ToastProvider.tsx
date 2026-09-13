"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Toast = { id: number; message: string; type: "success" | "error" | "info"; closing?: boolean };
const ToastContext = createContext<(message: string, type?: Toast["type"]) => void>(() => undefined);

export function notify(message: string, type: Toast["type"] = "info") {
  window.dispatchEvent(new CustomEvent("attensheet:toast", { detail: { message, type } }));
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; type: Toast["type"] }>).detail;
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, ...detail }]);
      window.setTimeout(() => {
        setToasts((current) => current.map((toast) => toast.id === id ? { ...toast, closing: true } : toast));
        window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 280);
      }, 4200);
    };
    window.addEventListener("attensheet:toast", handler);
    return () => window.removeEventListener("attensheet:toast", handler);
  }, []);
  const value = useMemo(() => (message: string, type?: Toast["type"]) => notify(message, type), []);
  return <ToastContext.Provider value={value}>{children}<div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">{toasts.map((toast) => <div key={toast.id} className={`${toast.closing ? "toast-exit" : "toast-enter"} pointer-events-auto relative w-full max-w-md overflow-hidden rounded-xl border px-4 py-3 pr-10 text-sm shadow-2xl backdrop-blur ${toast.type === "error" ? "border-rose-400/30 bg-rose-950/90 text-rose-100" : toast.type === "success" ? "border-emerald-400/30 bg-emerald-950/90 text-emerald-100" : "border-white/15 bg-slate-900/95 text-slate-100"}`}><button type="button" aria-label="Close notification" onClick={() => { setToasts((current) => current.map((item) => item.id === toast.id ? { ...item, closing: true } : item)); window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 280); }} className="absolute right-3 top-2 text-lg text-current/60 hover:text-current">×</button>{toast.message}<span className="toast-progress absolute bottom-0 left-0 h-0.5 bg-current/60" /></div>)}</div></ToastContext.Provider>;
}

export function useToast() {
  return useContext(ToastContext);
}
