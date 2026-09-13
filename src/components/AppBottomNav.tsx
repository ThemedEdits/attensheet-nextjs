"use client";

import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";

type Role = "cr" | "teacher" | "student";
type Tab = { label: string; href: string; icon: string };

const publicPaths = ["/", "/login", "/signup", "/complete-profile"];

export function AppBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [pending, setPending] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (publicPaths.includes(pathname)) return;
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) { setVisible(false); return; }
      setVisible(true);
      try {
        const response = await fetch("/api/dashboard", { headers: await authHeaders() });
        const result = await readApiResponse(response);
        setRole((result.profile as { role?: Role } | undefined)?.role ?? null);
        if ((result.profile as { role?: Role } | undefined)?.role === "cr") {
          const requests = await fetch("/api/requests", { headers: await authHeaders() });
          const requestData = await readApiResponse(requests);
          setPending(Array.isArray(requestData.requests) ? requestData.requests.length : 0);
        }
      } catch { setRole(null); }
    });
    return unsubscribe;
  }, [pathname]);

  const tabs = useMemo<Tab[]>(() => {
    if (role === "student") return [
      { label: "Subjects", href: "/subjects", icon: "▦" },
      { label: "History", href: "/subjects?view=history", icon: "◷" },
      { label: "Dashboard", href: "/dashboard", icon: "⌂" },
      { label: "Settings", href: "/settings", icon: "⚙" },
    ];
    return [
      { label: "Subjects", href: "/subjects", icon: "▦" },
      { label: role === "cr" ? "Requests" : "Attendance", href: role === "cr" ? "/cr/requests" : "/attendance", icon: role === "cr" ? "⌁" : "✓" },
      { label: "Dashboard", href: "/dashboard", icon: "⌂" },
      { label: role === "cr" ? "Sheets" : "Attendance", href: role === "cr" ? "/google" : "/attendance", icon: role === "cr" ? "▤" : "✓" },
      { label: "Settings", href: "/settings", icon: "⚙" },
    ];
  }, [role]);

  if (publicPaths.includes(pathname) || !visible || !role) return null;
  const activeIndex = Math.max(0, tabs.findIndex((tab) => pathname === tab.href.split("?")[0] || (tab.label === "Dashboard" && pathname === "/dashboard")));
  return <nav className="bottom-nav" aria-label="Primary navigation"><div className="bottom-nav-track">{tabs.map((tab, index) => {
    const active = index === activeIndex;
    return <button key={`${tab.label}-${index}`} type="button" onClick={() => router.push(tab.href)} className={`bottom-nav-item ${active ? "is-active" : ""}`}><span className="bottom-nav-icon">{tab.icon}</span><span>{tab.label}</span>{tab.label === "Requests" && pending > 0 && <b className="bottom-nav-badge">{pending > 9 ? "9+" : pending}</b>}</button>;
  })}<span className="bottom-nav-pill" style={{ width: `${100 / tabs.length}%`, transform: `translateX(${activeIndex * 100}%)` }} /></div></nav>;
}
