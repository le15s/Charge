"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UnreadBadge } from "./CommunityTabs";
import { FiBookOpen, FiBox, FiActivity, FiClock, FiCoffee, FiGrid, FiHome, FiMapPin, FiMessageSquare, FiMoreHorizontal, FiSettings } from "react-icons/fi";

export const APP_NAV = [
  { href: "/dashboard", label: "Home", icon: FiHome },
  { href: "/workouts", label: "Workouts", icon: FiGrid },
  { href: "/food", label: "Food", icon: FiCoffee },
  { href: "/stock", label: "Stock", icon: FiBox },
  { href: "/community", label: "Community", icon: FiMessageSquare },
  { href: "/body", label: "Body", icon: FiActivity },
  { href: "/history", label: "History", icon: FiClock },
  { href: "/exercises", label: "Exercises", icon: FiBookOpen },
  { href: "/gyms", label: "Gyms", icon: FiMapPin },
  { href: "/settings", label: "Settings", icon: FiSettings },
];
/** What the phone's bottom bar shows. Everything else lives under "More". */
const MOBILE = [...APP_NAV.slice(0, 5), { href: "/more", label: "More", icon: FiMoreHorizontal }];
const MORE_PATHS = ["/more", "/body", "/history", "/exercises", "/gyms", "/settings"];

const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/") || (href === "/workouts" && path.startsWith("/programs"));

export function SideNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="space-y-1">
      {APP_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(path, href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-[10px] px-4 py-2.5 font-semibold transition-colors ${active ? "text-[color:var(--sk-ink)]" : "text-text-dark hover:bg-light dark:text-darkmode-text-dark dark:hover:bg-darkmode-light"}`}>
            {active && <motion.span layoutId="side-pill" className="absolute inset-0 -z-0 rounded-[10px] bg-primary shadow-[0_3px_0_0_var(--sk-accent-strong)] dark:bg-darkmode-primary" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <Icon className="relative text-lg" /><span className="relative">{label}</span>{href === "/community" && <UnreadBadge className="relative ml-auto" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const path = usePathname();
  const items = MOBILE;
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-darkmode-border dark:bg-darkmode-card/95 lg:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/more" ? MORE_PATHS.some((m) => isActive(path, m)) : isActive(path, href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`relative flex flex-col items-center gap-0.5 pb-2 pt-3 text-xs font-semibold transition-colors ${active ? "text-primary dark:text-darkmode-primary" : "text-text-light dark:text-darkmode-text-light"}`}>
            {active && <motion.span layoutId="tab-bar" className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-primary dark:bg-darkmode-primary" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <motion.span className="relative" animate={{ y: active ? -1 : 0, scale: active ? 1.12 : 1 }} transition={{ type: "spring", stiffness: 500, damping: 24 }}><Icon className="text-xl" />{href === "/community" && <UnreadBadge className="absolute -right-2.5 -top-1.5 !min-w-[1rem] !text-[10px] !leading-4" />}</motion.span>{label}
          </Link>
        );
      })}
    </nav>
  );
}
