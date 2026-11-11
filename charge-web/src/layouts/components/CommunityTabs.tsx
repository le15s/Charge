"use client";

import { unreadChats } from "@/lib/chat-client";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CHATS_CHANGED, usePoll } from "./ChatBits";

/** Count of chats with something new. Shows on the Community tab and on the Messages tab. */
export function useUnread() {
  const [n, setN] = useState(0);
  const load = useCallback(async () => { try { setN(await unreadChats()); } catch { /* signed out, offline… */ } }, []);
  useEffect(() => { void load(); window.addEventListener(CHATS_CHANGED, load); return () => window.removeEventListener(CHATS_CHANGED, load); }, [load]);
  usePoll(load, 20000);
  return n;
}

export function UnreadBadge({ className = "" }: { className?: string }) {
  const n = useUnread();
  if (!n) return null;
  return <motion.span key={n} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 16 }} aria-label={`${n} chats with new messages`} className={`inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-plate-red px-1 text-[11px] font-bold leading-[1.15rem] text-white ${className}`}>{n > 9 ? "9+" : n}</motion.span>;
}

/** Rooms (everyone) and Messages (your private chats). */
const TAB_KEY = "charge-community-tab";
let lastSeen = 0;
export default function CommunityTabs() {
  const path = usePathname();
  const router = useRouter();
  const msgs = path.startsWith("/community/chats");
  // Come back to the tab you left: Messages stays Messages. Switching tabs inside Community (a quick hop) never redirects.
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(TAB_KEY); } catch { /* private mode */ }
    const fresh = Date.now() - lastSeen > 1500;
    if (fresh && path === "/community" && saved === "chats") { router.replace("/community/chats"); return; }
    try { localStorage.setItem(TAB_KEY, msgs ? "chats" : "rooms"); } catch { /* private mode */ }
    return () => { lastSeen = Date.now(); };
  }, [path, msgs, router]);
  const tabs = [{ href: "/community", label: "Rooms", on: !msgs }, { href: "/community/chats", label: "Messages", on: msgs }];
  return (
    <nav aria-label="Community" className="mb-5 inline-flex gap-1 rounded-full bg-light p-1 dark:bg-darkmode-light">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.on ? "page" : undefined} className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-colors ${t.on ? "text-[color:var(--sk-ink)]" : "text-text-dark dark:text-darkmode-text-dark"}`}>
          {t.on && <motion.span layoutId="community-tab" className="absolute inset-0 rounded-full bg-primary shadow-[0_3px_0_0_var(--sk-accent-strong)] dark:bg-darkmode-primary" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
          <span className="relative flex items-center gap-2">{t.label}{t.href.endsWith("chats") && <UnreadBadge />}</span>
        </Link>
      ))}
    </nav>
  );
}
