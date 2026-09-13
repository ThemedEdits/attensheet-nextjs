"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type Toast = { id: number; message: string; type: "success" | "error" | "info"; closing?: boolean };
const ToastContext = createContext<(message: string, type?: Toast["type"]) => void>(() => undefined);

export function notify(message: string, type: Toast["type"] = "info") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("attensheet:toast", { detail: { message, type } }));
  }
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
        window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 250);
      }, 4000);
    };

    window.addEventListener("attensheet:toast", handler);
    return () => window.removeEventListener("attensheet:toast", handler);
  }, []);

  const value = useMemo(() => (message: string, type?: Toast["type"]) => notify(message, type), []);

  const getToastStyles = (type: Toast["type"]) => {
    switch (type) {
      case "error":
        return {
          icon: AlertCircle,
          border: "border-red-500/30",
          bg: "bg-[#180A0A]/95",
          text: "text-red-200",
          iconColor: "text-red-400",
          bar: "bg-red-400",
        };
      case "success":
        return {
          icon: CheckCircle2,
          border: "border-[var(--border-hover)]",
          bg: "bg-[#0A1A13]/95",
          text: "text-[var(--text-primary)]",
          iconColor: "text-[var(--accent)]",
          bar: "bg-[var(--accent)]",
        };
      default:
        return {
          icon: Info,
          border: "border-[var(--border)]",
          bg: "bg-[var(--surface-elevated)]/95",
          text: "text-[var(--text-primary)]",
          iconColor: "text-[var(--info)]",
          bar: "bg-[var(--info)]",
        };
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div 
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2.5 px-4 sm:top-5 sm:right-5 sm:left-auto sm:w-full sm:max-w-sm sm:px-0"
        aria-live="polite"
        role="region"
      >
        {toasts.map((toast) => {
          const style = getToastStyles(toast.type);
          const Icon = style.icon;
          return (
            <div
              key={toast.id}
              className={`${
                toast.closing ? "toast-exit" : "toast-enter"
              } pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-xl border ${style.border} ${style.bg} p-4 pr-10 text-sm font-medium shadow-2xl shadow-black/50 backdrop-blur-md`}
            >
              <Icon className={`h-5 w-5 flex-none ${style.iconColor}`} />
              <span className={`flex-1 text-xs sm:text-sm leading-snug ${style.text}`}>{toast.message}</span>
              <button
                type="button"
                aria-label="Close notification"
                onClick={() => {
                  setToasts((current) => current.map((item) => item.id === toast.id ? { ...item, closing: true } : item));
                  window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 250);
                }}
                className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <span className={`toast-progress absolute bottom-0 left-0 h-[2px] ${style.bar}`} />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

