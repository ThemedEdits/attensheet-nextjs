"use client";

import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

export function AppFooter() {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  return (
    <footer
      className={`w-full text-center text-xs text-[var(--text-muted)] border-t border-[var(--border)]/40 ${
        isAuthPage ? "py-6 mt-8" : "mt-auto py-8 px-4"
      }`}
    >
      <div className="mx-auto max-w-7xl flex flex-col items-center justify-center gap-1">
        <p className="font-medium tracking-wide text-[var(--text-secondary)] flex items-center justify-center gap-1.5 flex-wrap">
          <span>Designed and Developed by</span>
          <a
            href="https://themededits.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[var(--accent)] hover:underline inline-flex items-center gap-1 transition-colors"
          >
            <span>Themed Edits</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
        <a
          href="https://themededits.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
        >
          https://themededits.vercel.app/
        </a>
      </div>
    </footer>
  );
}
