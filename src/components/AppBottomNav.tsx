"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Clock,
  LayoutDashboard,
  Settings,
  UserCheck,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  type LucideIcon
} from "lucide-react";
import { useSession, type Role } from "@/lib/session-cache";

type Tab = { label: string; href: string; icon: LucideIcon };

const publicPaths = ["/", "/login", "/signup", "/complete-profile"];

export function AppBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = publicPaths.includes(pathname);

  const [mounted, setMounted] = useState(false);
  const { session, loading } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  const role = session?.profile?.role ?? null;
  const isSecondaryCr = session?.isSecondaryCr ?? false;
  const pending = session?.pending ?? 0;

  const tabs = useMemo<Tab[]>(() => {
    if (role === "student") {
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ...(isSecondaryCr ? [{ label: "Attendance", href: "/attendance", icon: CheckCircle2 }] : []),
        { label: "Subjects", href: "/subjects", icon: BookOpen },
        { label: "History", href: "/history", icon: Clock },
        { label: "Settings", href: "/settings", icon: Settings },
      ];
    }
    if (role === "teacher") {
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Students", href: "/students", icon: Users },
        { label: "Subjects", href: "/subjects", icon: BookOpen },
        { label: "Attendance", href: "/attendance", icon: CheckCircle2 },
        { label: "Settings", href: "/settings", icon: Settings },
      ];
    }
    return [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Students", href: "/students", icon: Users },
      { label: "Subjects", href: "/subjects", icon: BookOpen },
      { label: "Requests", href: "/cr/requests", icon: UserCheck },
      { label: "Sheets", href: "/google", icon: FileSpreadsheet },
      { label: "Settings", href: "/settings", icon: Settings },
    ];
  }, [role, isSecondaryCr]);

  const skeletonCount = useMemo(() => {
    if (role === "cr") return 6;
    if (role === "teacher") return 5;
    if (role === "student") return isSecondaryCr ? 5 : 4;
    return 6;
  }, [role, isSecondaryCr]);

  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillLeft, setPillLeft] = useState<number | null>(null);

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => pathname === tab.href.split("?")[0] || (tab.label === "Dashboard" && pathname === "/dashboard"))
  );

  useEffect(() => {
    if (!mounted || loading || isPublic) return;

    const updatePosition = () => {
      const activeEl = itemRefs.current[activeIndex];
      if (activeEl) {
        setPillLeft(activeEl.offsetLeft + activeEl.offsetWidth / 2);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [activeIndex, tabs.length, mounted, loading, isPublic]);

  if (isPublic) return null;

  if (!mounted || (loading && !session)) {
    return <BottomNavSkeleton count={skeletonCount} />;
  }

  const activePercent = tabs.length > 0 ? ((activeIndex + 0.5) / tabs.length) * 100 : 50;
  const leftPosition = pillLeft !== null ? `${pillLeft}px` : `${activePercent}%`;
  const ActiveIcon = tabs[activeIndex]?.icon ?? LayoutDashboard;

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <div className="bottom-nav-track">
        {/* Elevated circular sliding active pill */}
        <div
          className="bottom-nav-pill"
          style={{ left: leftPosition }}
          aria-hidden="true"
        >
          <ActiveIcon className="h-5 w-5 stroke-[2.4] text-[#07110D] transition-transform duration-200" />
        </div>

        {/* Active indicator dot under active nav item (mobile only) */}
        <div
          className="bottom-nav-active-dot"
          style={{ left: leftPosition }}
          aria-hidden="true"
        />

        {/* Nav Items */}
        {tabs.map((tab, index) => {
          const active = index === activeIndex;
          const Icon = tab.icon;
          return (
            <button
              key={`${tab.label}-${index}`}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              onClick={() => router.push(tab.href)}
              className={`bottom-nav-item ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {/* When active, the icon is displayed in the elevated sliding pill above */}
              <span
                className={`bottom-nav-icon transition-all duration-200 ${
                  active ? "opacity-0 scale-50" : "opacity-100 scale-100"
                }`}
              >
                <Icon className="h-4 w-4 stroke-[2.2]" />
              </span>
              <span className={`bottom-nav-label ${active ? "font-semibold text-[var(--accent)]" : ""}`}>
                {tab.label}
              </span>
              {tab.label === "Requests" && pending > 0 && (
                <b className="bottom-nav-badge">{pending > 9 ? "9+" : pending}</b>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function BottomNavSkeleton({ count }: { count: number }) {
  return (
    <nav className="bottom-nav" aria-label="Loading navigation">
      <div className="bottom-nav-track">
        {Array.from({ length: count }, (_, i) => i + 1).map((item) => (
          <div key={item} className="bottom-nav-item animate-pulse">
            <div className="h-8 w-8 rounded-xl bg-[var(--surface-elevated)]" />
            <div className="h-2 w-10 rounded bg-[var(--surface-elevated)] hidden sm:block mt-1" />
          </div>
        ))}
      </div>
    </nav>
  );
}

