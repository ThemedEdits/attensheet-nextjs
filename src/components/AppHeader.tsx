"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { 
  Menu, 
  X, 
  LogOut, 
  LayoutDashboard, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  FileSpreadsheet, 
  Settings, 
  UserCheck, 
  ShieldCheck, 
  GraduationCap, 
  User,
  Users, 
  type LucideIcon 
} from "lucide-react";
import { firebaseAuth } from "@/lib/firebase";
import { useSession, clearCachedSession, type Role } from "@/lib/session-cache";

const publicPaths = ["/", "/login", "/signup", "/complete-profile"];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { session, loading } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  const profile = session?.profile ?? null;
  const isSecondaryCr = session?.isSecondaryCr ?? false;
  const pending = session?.pending ?? 0;

  const handleSignOut = async () => {
    closeMenu();
    try {
      await signOut(firebaseAuth);
    } finally {
      clearCachedSession();
      if (typeof window !== "undefined") {
        localStorage.removeItem("attensheet_install_dismissed");
        window.location.href = "/login";
      }
    }
  };

  const closeMenu = () => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setMobileMenuOpen(false);
  };

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    closeMenu();
  }

  if (publicPaths.includes(pathname)) return null;

  if (!mounted || (loading && !session)) {
    return <HeaderSkeleton />;
  }

  if (!profile) return null;

  const roleLabels: Record<Role, { title: string; icon: LucideIcon; color: string }> = {
    cr: { title: "Class Rep", icon: ShieldCheck, color: "text-[var(--accent)] border-[var(--accent-soft)] bg-[var(--accent-soft)]" },
    teacher: { title: "Teacher", icon: GraduationCap, color: "text-blue-400 border-blue-500/20 bg-blue-500/10" },
    student: { title: isSecondaryCr ? "2nd CR" : "Student", icon: isSecondaryCr ? ShieldCheck : User, color: isSecondaryCr ? "text-amber-400 border-amber-500/20 bg-amber-500/10" : "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
  };

  const currentRole = profile.role ? roleLabels[profile.role] : null;
  const RoleIcon = currentRole?.icon ?? User;

  const getNavLinks = () => {
    if (profile.role === "student") {
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ...(isSecondaryCr ? [{ label: "Attendance", href: "/attendance", icon: CheckCircle2 }] : []),
        { label: "Subjects", href: "/subjects", icon: BookOpen },
        { label: "Attendance History", href: "/history", icon: Clock },
        { label: "Settings", href: "/settings", icon: Settings },
      ];
    }
    if (profile.role === "teacher") {
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Students", href: "/students", icon: Users },
        { label: "Subjects", href: "/subjects", icon: BookOpen },
        { label: "Attendance", href: "/attendance", icon: CheckCircle2 },
        { label: "Settings", href: "/settings", icon: Settings },
      ];
    }
    if (profile.role === "cr") {
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Students", href: "/students", icon: Users },
        { label: "Subjects", href: "/subjects", icon: BookOpen },
        { 
          label: "Requests", 
          href: "/cr/requests", 
          icon: UserCheck,
          badge: pending > 0 ? pending : undefined
        },
        { label: "Google Sheets", href: "/google", icon: FileSpreadsheet },
        { label: "Settings", href: "/settings", icon: Settings },
      ];
    }
    // Safe default for unassigned, onboarding, or resolving roles
    return [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Settings", href: "/settings", icon: Settings },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-[var(--border)] bg-[#07110D]/85 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-6">
            <Link 
              href="/dashboard" 
              className="group flex items-center gap-2.5 font-semibold tracking-tight transition-transform active:scale-95"
            >
              <img 
                src="/attensheetlogo.svg" 
                alt="AttenSheet" 
                className="h-8 w-auto object-contain" 
              />
              <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                Atten<span className="text-[var(--accent)]">Sheet</span>
              </span>
            </Link>

            {/* Quick divider */}
            <div className="hidden h-4 w-px bg-[var(--border)] sm:block" />

            {/* Role indicator pill */}
            {currentRole && (
              <div className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium sm:inline-flex ${currentRole.color}`}>
                <RoleIcon className="h-3.5 w-3.5" />
                <span>{currentRole.title}</span>
              </div>
            )}
          </div>

          {/* Right: User Profile & Actions (Desktop) */}
          <div className="hidden items-center gap-3 md:flex">
            {profile.role === "cr" && pending > 0 && (
              <Link 
                href="/cr/requests"
                className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-all"
              >
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span>{pending} {pending === 1 ? "request" : "requests"}</span>
              </Link>
            )}

            <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--surface-elevated)] text-xs font-semibold text-[var(--accent)] border border-[var(--border)]">
                {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-[var(--text-primary)] leading-tight max-w-[140px] truncate">
                  {profile.name ?? "User"}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] capitalize leading-tight">
                  {profile.role}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile Hamburger Button & Pending indicator */}
          <div className="flex items-center gap-2 md:hidden">
            {profile.role === "cr" && pending > 0 && (
              <Link
                href="/cr/requests"
                className="flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-300 animate-pulse"
                title={`${pending} pending requests`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span>{pending > 9 ? "9+" : pending}</span>
              </Link>
            )}
            {currentRole && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${currentRole.color}`}>
                {currentRole.title}
              </span>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((curr) => !curr)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              {profile.role === "cr" && pending > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-[#07110D]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Out Drawer */}
      <div 
        className={`fixed inset-0 z-50 transition-all duration-300 md:hidden ${
          mobileMenuOpen ? "pointer-events-auto visible" : "pointer-events-none invisible"
        }`}
      >
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-out ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`} 
          onClick={closeMenu} 
        />

        {/* Drawer Content */}
        <div 
          inert={!mobileMenuOpen ? true : undefined}
          className={`fixed inset-y-0 right-0 w-full max-w-xs border-l border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div>
            {/* Drawer Top */}
            <div className="flex items-center justify-between pb-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--surface-elevated)] text-sm font-bold text-[var(--accent)] border border-[var(--border)]">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                    {profile.name ?? "User"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] capitalize leading-snug">
                    {profile.role}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeMenu}
                className="rounded-lg p-2 text-[var(--text-muted)] hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="mt-6 space-y-1.5" aria-label="Mobile Navigation">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href.split("?")[0];
                return (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => {
                      closeMenu();
                      router.push(link.href);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                      isActive 
                        ? "bg-[var(--primary)] text-[#07110D] font-semibold" 
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </div>
                    {link.badge !== undefined && link.badge > 0 && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                        {link.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Drawer Bottom: Sign Out */}
          <div className="pt-6 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-[var(--border)] bg-[#07110D]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <img 
              src="/attensheetlogo.svg" 
              alt="AttenSheet" 
              className="h-8 w-auto object-contain opacity-70" 
            />
            <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">
              Atten<span className="text-[var(--accent)]">Sheet</span>
            </span>
          </div>
          <div className="hidden h-4 w-px bg-[var(--border)] sm:block" />
          <div className="hidden h-5 w-20 rounded-full bg-[var(--surface-elevated)] animate-pulse sm:block" />
        </div>

        {/* Right: Actions Skeleton (Desktop) */}
        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 animate-pulse">
            <div className="h-7 w-7 rounded-lg bg-[var(--surface-elevated)]" />
            <div className="space-y-1">
              <div className="h-2.5 w-16 rounded bg-[var(--surface-elevated)]" />
              <div className="h-2 w-10 rounded bg-[var(--surface-elevated)]" />
            </div>
          </div>
          <div className="h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
        </div>

        {/* Right: Hamburger Skeleton (Mobile) */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="h-5 w-16 rounded-full bg-[var(--surface-elevated)] animate-pulse" />
          <div className="h-10 w-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
        </div>
      </div>
    </header>
  );
}
