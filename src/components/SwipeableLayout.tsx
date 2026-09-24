"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useSwipeable } from "react-swipeable";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@/lib/session-cache";

const getTabsForRole = (role: string | null | undefined, isSecondaryCr: boolean) => {
  if (role === "student") {
    const base = ["/dashboard"];
    if (isSecondaryCr) base.push("/attendance");
    base.push("/subjects", "/history", "/settings");
    return base;
  }
  if (role === "teacher") {
    return ["/dashboard", "/students", "/subjects", "/attendance", "/settings"];
  }
  if (role === "cr") {
    return ["/dashboard", "/students", "/subjects", "/cr/requests", "/google", "/settings"];
  }
  return ["/dashboard", "/settings"];
};

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

export function SwipeableLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useSession();

  const role = session?.profile?.role;
  const isSecondaryCr = session?.isSecondaryCr ?? false;

  const tabs = useMemo(() => getTabsForRole(role, isSecondaryCr), [role, isSecondaryCr]);
  
  // Find current tab index (matching exact path or root of it)
  const currentTabIndex = useMemo(() => {
    return tabs.findIndex(tab => pathname === tab || (tab !== "/" && pathname.startsWith(tab)));
  }, [pathname, tabs]);

  const [direction, setDirection] = useState(0);
  const [prevIndex, setPrevIndex] = useState(currentTabIndex);

  useEffect(() => {
    if (currentTabIndex !== prevIndex && currentTabIndex !== -1) {
      setDirection(currentTabIndex > prevIndex ? 1 : -1);
      setPrevIndex(currentTabIndex);
    }
  }, [currentTabIndex, prevIndex]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 450); // Targeting small devices as requested
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (isMobile && currentTabIndex !== -1 && currentTabIndex < tabs.length - 1) {
        setDirection(1);
        router.push(tabs[currentTabIndex + 1]);
      }
    },
    onSwipedRight: () => {
      if (isMobile && currentTabIndex > 0) {
        setDirection(-1);
        router.push(tabs[currentTabIndex - 1]);
      }
    },
    preventScrollOnSwipe: false,
    trackTouch: true,
    trackMouse: false,
    delta: 50, // Minimum swipe distance
  });

  // If not on a bottom nav page or not mobile, just render normally to avoid unnecessary wrappers
  if (!isMobile || currentTabIndex === -1) {
    return <div className="page-shell-content">{children}</div>;
  }

  return (
    <div {...handlers} className="page-shell-content relative overflow-x-hidden w-full">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={pathname}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
