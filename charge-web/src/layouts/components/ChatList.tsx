"use client";

import { listBlocked, listChats, unblockUser, type ChatSummary, type Person } from "@/lib/chat-client";
import { shortTime } from "@/lib/chat";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FiEdit, FiSearch } from "react-icons/fi";
import { Avatar, CHATS_CHANGED, usePoll } from "./ChatBits";
import NewChatSheet from "./NewChatSheet";

function Preview({ c }: { c: ChatSummary }) {
  if (!c.last) return <span className="italic">{c.isNew ? "New chat" : "No messages yet"}</span>;
  if (c.last.system) return <span className="italic">{c.last.body}</span>;
  const who = c.last.mine ? "You: " : c.kind === "group" && c.last.author ? `${c.last.author}: ` : "";
  return <>{who}{c.last.body}</>;
}

export default function ChatList({ initial, activeId }: { initial: ChatSummary[]; activeId: string | null }) {
  const [chats, setChats] = useState(initial);
  const [q, setQ] = useState("");
  const [sheet, setSheet] = useState(false);
  const [blocked, setBlocked] = useState<Person[] | null>(null);
  const [showBlocked, setShowBlocked] = useState(false);

  const refresh = useCallback(async () => { setChats(await listChats()); }, []);
  usePoll(refresh, 6000);
  useEffect(() => { const h = () => void refresh(); window.addEventListener(CHATS_CHANGED, h); return () => window.removeEventListener(CHATS_CHANGED, h); }, [refresh]);
  useEffect(() => { if (activeId) void refresh(); }, [activeId, refresh]);

  const shown = q.trim() ? chats.filter((c) => c.title.toLowerCase().includes(q.trim().toLowerCase())) : chats;

  async function toggleBlocked() {
    const next = !showBlocked; setShowBlocked(next);
    if (next) setBlocked(await listBlocked());
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="h4 italic">Messages</h1>
        <button type="button" className="btn btn-primary btn-sm !rounded-full" onClick={() => setSheet(true)}><FiEdit aria-hidden /> New chat</button>
      </div>
      {chats.length > 4 && (
        <div className="relative mb-3">
          <FiSearch aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-light dark:text-darkmode-text-light" />
          <input type="search" aria-label="Search your chats" placeholder="Search chats" value={q} onChange={(e) => setQ(e.target.value)} className="form-input !rounded-full !py-2.5 !pl-11 text-sm" />
        </div>
      )}
      <div className="-mx-1 min-h-0 grow overflow-y-auto px-1">
        {chats.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-light text-4xl dark:bg-darkmode-light" aria-hidden>💬</motion.div>
            <h2 className="h5 mb-1 italic">No chats yet</h2>
            <p className="mx-auto mb-5 max-w-xs text-sm">Message a gym buddy or start a group of up to 10 people. Find them by username.</p>
            <button type="button" className="btn btn-primary" onClick={() => setSheet(true)}>Start a chat</button>
          </div>
        ) : (
          <ul className="space-y-1" aria-label="Your chats">
            <AnimatePresence initial={false}>
              {shown.map((c) => {
                const active = c.id === activeId, hot = c.unread > 0 || c.isNew;
                return (
                  <motion.li layout key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: "spring", stiffness: 420, damping: 34 }}>
                    <Link href={`/community/chats/${c.id}`} prefetch={false} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors active:scale-[0.99] ${active ? "bg-primary/12 dark:bg-darkmode-primary/15" : "hover:bg-light dark:hover:bg-darkmode-light"}`}>
                      <Avatar name={c.title} group={c.kind === "group"} size={50} />
                      <span className="min-w-0 grow">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate ${hot ? "font-bold" : "font-semibold"} text-text-dark dark:text-darkmode-text-dark`}>{c.kind === "direct" ? "@" : ""}{c.title}</span>
                          {c.last && <span className={`shrink-0 text-xs tabular-nums ${hot ? "font-bold text-primary dark:text-darkmode-primary" : "text-text-light dark:text-darkmode-text-light"}`}>{shortTime(c.last.at)}</span>}
                        </span>
                        <span className="flex items-center justify-between gap-2">
                          <span className={`line-clamp-1 text-sm ${hot ? "text-text-dark dark:text-darkmode-text-dark" : "text-text-light dark:text-darkmode-text-light"}`}><Preview c={c} /></span>
                          {hot && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }} className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-[color:var(--sk-ink)] dark:bg-darkmode-primary">{c.unread > 0 ? (c.unread > 99 ? "99+" : c.unread) : "new"}</motion.span>}
                        </span>
                      </span>
                    </Link>
                  </motion.li>
                );
              })}
            </AnimatePresence>
            {!shown.length && <li className="py-8 text-center text-sm">No chat matches “{q}”.</li>}
          </ul>
        )}
        <div className="mt-4 border-t border-border pt-3 text-center dark:border-darkmode-border">
          <button type="button" onClick={toggleBlocked} className="text-xs font-semibold text-text-light underline-offset-2 hover:underline dark:text-darkmode-text-light">{showBlocked ? "Hide blocked people" : "Blocked people"}</button>
          {showBlocked && (
            <ul className="mx-auto mt-2 max-w-xs space-y-1 text-sm">
              {blocked === null ? <li>…</li> : blocked.length === 0 ? <li className="text-text-light dark:text-darkmode-text-light">You haven&apos;t blocked anyone.</li> : blocked.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-light px-3 py-1.5 dark:bg-darkmode-light"><span>@{p.name}</span><button className="font-semibold underline" onClick={async () => { await unblockUser(p.id); setBlocked((b) => b?.filter((x) => x.id !== p.id) ?? null); }}>Unblock</button></li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <NewChatSheet open={sheet} onClose={() => setSheet(false)} />
    </div>
  );
}
