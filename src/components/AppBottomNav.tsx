"use client";

import { onAuthStateChanged } from "firebase/auth";
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
import { firebaseAuth } from "@/lib/firebase";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";

type Role = "cr" | "teacher" | "student";
type Tab = { label: string; href: string; icon: LucideIcon };

const publicPaths = ["/", "/login", "/signup", "/complete-profile"];

export function AppBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = publicPaths.includes(pathname);

  const [mounted, setMounted] = useState(false);
  const [cachedRole, setCachedRole] = useState<Role | null>(null);
  const [cachedSecondaryCr, setCachedSecondaryCr] = useState<boolean>(false);
  const [role, setRole] = useState<Role | null>(null);
  const [isSecondaryCr, setIsSecondaryCr] = useState(false);
  const [pending, setPending] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync from localStorage immediately on client mount (avoids SSR hydration mismatch #418)
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const localRole = (localStorage.getItem("attensheet_role") as Role) || null;
      const localSec = localStorage.getItem("attensheet_secondary_cr") === "true";
      if (localRole) {
        setCachedRole(localRole);
        setRole(localRole);
        setCachedSecondaryCr(localSec);
        setIsSecondaryCr(localSec);
        if (!publicPaths.includes(pathname)) {
          setVisible(true);
          setLoading(false);
        }
      }
    }
  }, [pathname]);

  useEffect(() => {
    if (publicPaths.includes(pathname)) return;

    let mounted = true;
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        if (mounted) {
          setVisible(false);
          setLoading(false);
          setRole(null);
        }
        return;
      }
      if (mounted) setVisible(true);

      // Background revalidation (stale-while-revalidate pattern)
      try {
        const response = await fetch("/api/dashboard", { headers: await authHeaders() });
        const result = await readApiResponse(response);
        if (mounted && response.ok) {
          const userRole = (result.profile as { role?: Role } | undefined)?.role ?? null;
          const isSec = Boolean(result.isSecondaryCr);
          setRole(userRole);
          setIsSecondaryCr(isSec);
          if (typeof window !== "undefined" && userRole) {
            localStorage.setItem("attensheet_role", userRole);
            localStorage.setItem("attensheet_secondary_cr", String(isSec));
            setCachedRole(userRole);
            setCachedSecondaryCr(isSec);
          }
          // Non-blocking fetch for pending badge count
          if (userRole === "cr") {
            void fetch("/api/requests", { headers: await authHeaders() })
              .then(readApiResponse)
              .then((requestData) => {
                if (mounted && Array.isArray(requestData.requests)) {
                  setPending(requestData.requests.length);
                }
              })
              .catch(() => {});
          }
        }
      } catch {
        if (mounted && !cachedRole) setRole(null);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [pathname, cachedRole]);

  const tabs = useMemo<Tab[]>(() => {
    const activeRole = role ?? cachedRole;
    const activeSec = isSecondaryCr || cachedSecondaryCr;
    if (activeRole === "student") {
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ...(activeSec ? [{ label: "Attendance", href: "/attendance", icon: CheckCircle2 }] : []),
        { label: "Subjects", href: "/subjects", icon: BookOpen },
        { label: "History", href: "/history", icon: Clock },
        { label: "Settings", href: "/settings", icon: Settings },
      ];
    }
    if (activeRole === "teacher") {
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
  }, [role, cachedRole, isSecondaryCr, cachedSecondaryCr]);

  const skeletonCount = useMemo(() => {
    const activeRole = role ?? cachedRole;
    const isSec = isSecondaryCr || cachedSecondaryCr;
    if (activeRole === "cr") return 6;
    if (activeRole === "teacher") return 5;
    if (activeRole === "student") return isSec ? 5 : 4;
    if (pathname.startsWith("/cr")) return 6;
    return 6;
  }, [role, cachedRole, isSecondaryCr, cachedSecondaryCr, pathname]);

  if (publicPaths.includes(pathname)) return null;

  if (!mounted || loading) {
    return <BottomNavSkeleton count={skeletonCount} />;
  }

  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillLeft, setPillLeft] = useState<number | null>(null);

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => pathname === tab.href.split("?")[0] || (tab.label === "Dashboard" && pathname === "/dashboard"))
  );

  useEffect(() => {
    const updatePosition = () => {
      const activeEl = itemRefs.current[activeIndex];
      if (activeEl) {
        setPillLeft(activeEl.offsetLeft + activeEl.offsetWidth / 2);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [activeIndex, tabs.length]);

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

