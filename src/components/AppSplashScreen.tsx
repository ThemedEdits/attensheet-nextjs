"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function AppSplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true;

      if (isStandalone && !sessionStorage.getItem("attensheet_splash_shown")) {
        sessionStorage.setItem("attensheet_splash_shown", "true");
        setVisible(true);
        const timer = setTimeout(() => {
          setFading(true);
          const removeTimer = setTimeout(() => {
            setVisible(false);
          }, 400);
          return () => clearTimeout(removeTimer);
        }, 900);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07110d] px-6 select-none transition-opacity duration-500 ease-out ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden={!visible}
    >
      {/* Background ambient radial aura */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[360px] h-[360px] rounded-full bg-[radial-gradient(circle,rgba(22,166,106,0.22)_0%,transparent_70%)] animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Animated Brand Logo Icon */}
        <div className="relative mb-6">
          <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-[#16A66A]/40 to-[#35D98A]/30 blur-xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--border)] bg-[#0D1C16] shadow-2xl shadow-[#16A66A]/20">
            <img
              src="/attensheetlogo.svg"
              alt="AttenSheet"
              className="h-11 w-11 object-contain drop-shadow-[0_2px_12px_rgba(53,217,138,0.4)]"
            />
          </div>
        </div>

        {/* Title & Badge */}
        <h1 className="text-3xl font-extrabold tracking-tight text-[#F1F7F4]">
          Atten<span className="text-[#35D98A]">Sheet</span>
        </h1>
        <p className="mt-1.5 text-xs font-medium tracking-wide uppercase text-[#71847C]">
          University Attendance Platform
        </p>

        {/* Progress bar */}
        <div className="mt-8 w-44">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#10221A] border border-[rgba(120,180,150,0.12)]">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-[#16A66A] to-[#35D98A] animate-indeterminate" />
          </div>
          <p className="mt-2.5 text-[11px] text-[#A9BBB3]/80">
            Connecting to workspace...
          </p>
        </div>
      </div>

      <div className="absolute bottom-6 text-[10px] tracking-wider text-[#71847C]/70">
        POWERED BY ATTENSHEET CLOUD
      </div>
    </div>
  );
}
