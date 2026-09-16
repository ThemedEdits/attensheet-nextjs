"use client";

import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  const [cachedRole, setCachedRole] = useState<Role | null>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("attensheet_role") as Role) || null;
    }
    return null;
  });
  const [cachedSecondaryCr, setCachedSecondaryCr] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("attensheet_secondary_cr") === "true";
    }
    return false;
  });
  const [role, setRole] = useState<Role | null>(cachedRole);
  const [isSecondaryCr, setIsSecondaryCr] = useState(cachedSecondaryCr);
  const [pending, setPending] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (publicPaths.includes(pathname)) return;

    let mounted = true;
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        if (mounted) {
          setVisible(false);
          setLoading(false);
        }
        return;
      }
      if (mounted) setVisible(true);
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
          if (userRole === "cr") {
            const requests = await fetch("/api/requests", { headers: await authHeaders() });
            const requestData = await readApiResponse(requests);
            if (mounted) {
              setPending(Array.isArray(requestData.requests) ? requestData.requests.length : 0);
            }
          }
        }
      } catch {
        if (mounted) setRole(null);
      } finally {
        if (mounted) setLoading(false);
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

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
    const activeRole = role ?? cachedRole;
    const isSec = isSecondaryCr || cachedSecondaryCr;
    if (activeRole === "cr") return 6;
    if (activeRole === "teacher") return 5;
    if (activeRole === "student") return isSec ? 5 : 4;
    if (pathname.startsWith("/cr")) return 6;
    return 6;
  }, [role, cachedRole, isSecondaryCr, cachedSecondaryCr, pathname]);

  if (publicPaths.includes(pathname)) return null;

  if (loading) {
    return <BottomNavSkeleton count={skeletonCount} />;
  }

  if (!visible || !role) return null;

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => pathname === tab.href.split("?")[0] || (tab.label === "Dashboard" && pathname === "/dashboard"))
  );

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <div
        className="bottom-nav-track"
        data-active-index={activeIndex}
        data-count={tabs.length}
      >
        {tabs.map((tab, index) => {
          const active = index === activeIndex;
          const Icon = tab.icon;
          return (
            <button
              key={`${tab.label}-${index}`}
              type="button"
              onClick={() => router.push(tab.href)}
              className={`bottom-nav-item relative ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="bottom-nav-icon">
                <Icon className="h-4 w-4 stroke-[2.2]" />
              </span>
              <span className="bottom-nav-label">{tab.label}</span>
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
      <div className="bottom-nav-track" data-count={count} data-active-index={-1}>
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