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
  const [role, setRole] = useState<Role | null>(null);
  const [pending, setPending] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (publicPaths.includes(pathname)) return;

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        setVisible(false);
        setLoading(false);
        return;
      }
      setVisible(true);
      try {
        const response = await fetch("/api/dashboard", { headers: await authHeaders() });
        const result = await readApiResponse(response);
        const userRole = (result.profile as { role?: Role } | undefined)?.role ?? null;
        setRole(userRole);
        if (userRole === "cr") {
          const requests = await fetch("/api/requests", { headers: await authHeaders() });
          const requestData = await readApiResponse(requests);
          setPending(Array.isArray(requestData.requests) ? requestData.requests.length : 0);
        }
      } catch {
        setRole(null);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [pathname]);

  const tabs = useMemo<Tab[]>(() => {
    if (role === "student") {
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Subjects", href: "/subjects", icon: BookOpen },
        { label: "History", href: "/history", icon: Clock },
        { label: "Settings", href: "/settings", icon: Settings },
      ];
    }
    if (role === "teacher") {
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Subjects", href: "/subjects", icon: BookOpen },
        { label: "Attendance", href: "/attendance", icon: CheckCircle2 },
        { label: "Settings", href: "/settings", icon: Settings },
      ];
    }
    return [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Subjects", href: "/subjects", icon: BookOpen },
      { label: "Requests", href: "/cr/requests", icon: UserCheck },
      { label: "Sheets", href: "/google", icon: FileSpreadsheet },
      { label: "Settings", href: "/settings", icon: Settings },
    ];
  }, [role]);

  if (publicPaths.includes(pathname)) return null;

  if (loading) {
    return <BottomNavSkeleton />;
  }

  if (!visible || !role) return null;

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => pathname === tab.href.split("?")[0] || (tab.label === "Dashboard" && pathname === "/dashboard"))
  );

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <div className="bottom-nav-track">
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
              {active && (
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[2.5px] w-7 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function BottomNavSkeleton() {
  return (
    <nav className="bottom-nav" aria-label="Loading navigation">
      <div className="bottom-nav-track">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="bottom-nav-item animate-pulse">
            <div className="h-8 w-8 rounded-xl bg-[var(--surface-elevated)]" />
            <div className="h-2 w-10 rounded bg-[var(--surface-elevated)] hidden sm:block mt-1" />
          </div>
        ))}
      </div>
    </nav>
  );
}

