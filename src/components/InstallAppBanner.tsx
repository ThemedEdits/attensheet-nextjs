"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone, Share, PlusSquare } from "lucide-react";

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if running in standalone PWA / Capacitor webview
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    setIsStandalone(isRunningStandalone);

    if (isRunningStandalone) return;

    // Check if user previously dismissed banner
    const isDismissed = localStorage.getItem("attensheet_install_dismissed") === "true";
    setDismissed(isDismissed);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // Capture Chrome/Android install prompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setDeferredPrompt(null);
        setDismissed(true);
      }
    } else if (isIOS) {
      setShowIOSInstructions(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("attensheet_install_dismissed", "true");
  };

  if (isStandalone || dismissed) return null;

  return (
    <>
      {/* Install App floating banner */}
      <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md sm:bottom-6 sm:left-auto sm:right-6">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-hover)] bg-[#0B1813]/95 p-3.5 shadow-2xl shadow-black/70 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#16A66A] to-[#0D7A4D] text-white shadow-md shadow-[#16A66A]/30">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Install AttenSheet App
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Fast full-screen mobile experience
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void handleInstallClick()}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[var(--primary-hover)] active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Manual Install Modal Instructions */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[#0D1C16] p-5 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16A66A]/20 text-[#35D98A]">
              <Share className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Install on iPhone or iPad
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Follow these simple steps in Safari to add AttenSheet to your home screen:
            </p>

            <div className="mt-4 space-y-2.5 text-left text-xs text-[var(--text-primary)]">
              <div className="flex items-center gap-2.5 rounded-xl bg-[#07110D] p-2.5 border border-[var(--border)]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[10px] font-bold text-[var(--accent)]">
                  1
                </span>
                <span>
                  Tap the <strong>Share</strong> button <Share className="inline h-3.5 w-3.5 text-[var(--accent)] mx-1" /> in Safari’s navigation bar.
                </span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-[#07110D] p-2.5 border border-[var(--border)]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[10px] font-bold text-[var(--accent)]">
                  2
                </span>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="inline h-3.5 w-3.5 text-[var(--accent)] mx-1" />.
                </span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-[#07110D] p-2.5 border border-[var(--border)]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[10px] font-bold text-[var(--accent)]">
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> in the top-right corner to finish.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="mt-5 w-full rounded-xl bg-[var(--primary)] py-2 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
