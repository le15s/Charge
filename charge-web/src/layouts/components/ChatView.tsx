"use client";

import { deleteChatMessage, listChatMessages, markChatRead, reportChatMessage, sendChatMessage, type ChatFull, type ChatMsg, type MemberInfo } from "@/lib/chat-client";
import { clock, dayLabel, MAX_MSG } from "@/lib/chat";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiArrowDown, FiChevronLeft, FiCopy, FiCornerUpLeft, FiFlag, FiInfo, FiSend, FiTrash2 } from "react-icons/fi";
import { Avatar, Linkify, pingChats, Ticks, usePoll } from "./ChatBits";
import ChatInfoSheet from "./ChatInfoSheet";

type Msg = ChatMsg & { pending?: boolean; failed?: boolean };
const GAP = 5 * 60_000;
const dayKey = (t: number) => new Date(t).toDateString();

export default function ChatView({ initial }: { initial: ChatFull }) {
  const router = useRouter();
  const { id, meId } = initial;
  const [title, setTitle] = useState(initial.title);
  const [members, setMembers] = useState<MemberInfo[]>(initial.members);
  const [ownerId, setOwnerId] = useState(initial.ownerId);
  const [iBlocked, setIBlocked] = useState(initial.iBlocked);
  const [msgs, setMsgs] = useState<Msg[]>(initial.messages);
  const [more, setMore] = useState(initial.more);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [newBelow, setNewBelow] = useState(0);
  const [info, setInfo] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const atBottom = useRef(true);
  const latest = useRef(initial.messages.reduce((a, m) => Math.max(a, m.at), 0));
  const draftKey = `chat-draft-${id}`;
  const isGroup = initial.kind === "group";
  const me = members.find((m) => m.id === meId);
  const others = members.filter((m) => m.id !== meId);
  const blockedHere = !isGroup && (iBlocked || initial.blockedMe);

  const toBottom = useCallback((smooth = false) => { const el = box.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" }); }, []);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 2600); };

  // open at the latest message, restore a half-written message, tell the sender it was read
  useEffect(() => {
    toBottom();
    try { const d = localStorage.getItem(draftKey); if (d) setText(d); } catch { /* private mode */ }
    void markChatRead(id).then(pingChats);
  }, [id, draftKey, toBottom]);
  useEffect(() => { try { if (text) localStorage.setItem(draftKey, text); else localStorage.removeItem(draftKey); } catch { /* private mode */ } }, [text, draftKey]);
  useEffect(() => { const el = area.current; if (el) { el.style.height = "auto"; el.style.height = Math.min(140, el.scrollHeight) + "px"; } }, [text]);

  const merge = useCallback((incoming: ChatMsg[]) => {
    if (!incoming.length) return 0;
    let fresh = 0;
    setMsgs((cur) => {
      const have = new Set(cur.map((m) => m.id));
      const add = incoming.filter((m) => !have.has(m.id));
      fresh = add.filter((m) => !m.mine).length;
      if (!add.length) return cur;
      // a message of mine that is still "sending" has just arrived from the server: drop the placeholder
      const mineBodies = new Set(add.filter((m) => m.mine).map((m) => m.body));
      const kept = cur.filter((m) => !(m.pending && mineBodies.has(m.body)));
      return [...kept, ...add].sort((a, b) => a.at - b.at);
    });
    latest.current = Math.max(latest.current, ...incoming.map((m) => m.at));
    return fresh;
  }, []);

  const markedAt = useRef(0);
  const poll = useCallback(async () => {
    const r = await listChatMessages(id, { after: latest.current });
    if (r.gone) { router.replace("/community/chats"); pingChats(); return; }
    setMembers(r.members);
    setOwnerId(r.members.find((m) => m.owner)?.id ?? null);
    const fresh = merge(r.messages);
    if (fresh > 0) {
      if (atBottom.current) { setTimeout(() => toBottom(true), 30); void markChatRead(id).then(pingChats); } else setNewBelow((n) => n + fresh);
      markedAt.current = latest.current;
    } else if (document.visibilityState === "visible" && atBottom.current && latest.current > markedAt.current) {
      markedAt.current = latest.current; // only tell the server when something new has been seen
      void markChatRead(id).then(pingChats);
    }
  }, [id, merge, router, toBottom]);
  usePoll(poll, 3000);

  async function older() {
    const first = msgs.find((m) => !m.pending);
    if (!first) return;
    const r = await listChatMessages(id, { before: first.at });
    if (r.gone) return;
    const prev = box.current?.scrollHeight ?? 0;
    setMsgs((c) => { const have = new Set(c.map((m) => m.id)); return [...r.messages.filter((m) => !have.has(m.id)), ...c]; });
    setMore(r.more);
    requestAnimationFrame(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight - prev; });
  }

  async function deliver(tmpId: string, body: string, replyId: string | null) {
    const r = await sendChatMessage(id, body, replyId);
    if (!r.ok) { setMsgs((c) => c.map((m) => (m.id === tmpId ? { ...m, pending: false, failed: true } : m))); flash(r.error); return; }
    latest.current = Math.max(latest.current, r.message.at);
    setMsgs((c) => (c.some((m) => m.id === r.message.id) ? c.filter((m) => m.id !== tmpId) : c.map((m) => (m.id === tmpId ? r.message : m))).sort((a, b) => a.at - b.at));
    pingChats();
  }
  function send() {
    const body = text.trim();
    if (!body || blockedHere) return;
    const tmp: Msg = { id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, kind: "text", authorId: meId, author: me?.name ?? "You", body, at: Date.now(), mine: true, reply: replyTo ? { author: replyTo.author ?? "", body: replyTo.body.slice(0, 120) } : null, pending: true };
    const replyId = replyTo && !replyTo.id.startsWith("tmp-") ? replyTo.id : null;
    atBottom.current = true;
    setMsgs((c) => [...c, tmp]); setText(""); setReplyTo(null); setSelected(null);
    setTimeout(() => toBottom(true), 30);
    void deliver(tmp.id, body, replyId);
  }
  function retry(m: Msg) {
    setMsgs((c) => c.map((x) => (x.id === m.id ? { ...x, pending: true, failed: false } : x)));
    void deliver(m.id, m.body, null);
  }
  const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const seen = (m: Msg) => others.length > 0 && others.every((o) => o.readAt >= m.at);

  return (
    <div className="card flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border px-3 py-2.5 dark:border-darkmode-border">
        <Link href="/community/chats" aria-label="Back to your chats" className="flex h-9 w-9 items-center justify-center rounded-full text-2xl hover:bg-light dark:hover:bg-darkmode-light lg:hidden"><FiChevronLeft /></Link>
        <button type="button" onClick={() => setInfo(true)} className="flex min-w-0 grow items-center gap-3 rounded-xl text-left" aria-label="Chat details">
          <Avatar name={title} group={isGroup} size={42} />
          <span className="min-w-0">
            <span className="block truncate font-bold text-text-dark dark:text-darkmode-text-dark">{isGroup ? title : `@${title}`}</span>
            <span className="block truncate text-xs text-text-light dark:text-darkmode-text-light">{isGroup ? `${members.length} of 10 people · ${members.map((m) => (m.id === meId ? "You" : "@" + m.name)).join(", ")}` : blockedHere ? "Blocked" : "Direct message"}</span>
          </span>
        </button>
        <button type="button" onClick={() => setInfo(true)} aria-label="Chat details" className="flex h-9 w-9 items-center justify-center rounded-full text-xl hover:bg-light dark:hover:bg-darkmode-light"><FiInfo /></button>
      </header>

      <div className="relative min-h-0 grow">
        <div ref={box} onScroll={(e) => { const el = e.currentTarget; atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90; if (atBottom.current) setNewBelow(0); }} onClick={() => setSelected(null)} className="chat-wall h-full overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite" aria-label="Messages">
          {more && <div className="mb-3 text-center"><button className="btn btn-outline-primary btn-sm" onClick={older}>Show earlier messages</button></div>}
          {msgs.length === 0 && <p className="py-16 text-center text-text-light dark:text-darkmode-text-light">No messages yet. Say hello 👋</p>}
          <AnimatePresence initial={false}>
            {msgs.map((m, i) => {
              const prev = msgs[i - 1], next = msgs[i + 1];
              const newDay = !prev || dayKey(prev.at) !== dayKey(m.at);
              const sep = newDay && <div className="my-3 flex justify-center"><span className="rounded-full bg-light px-3 py-1 text-xs font-semibold text-text-light dark:bg-darkmode-light dark:text-darkmode-text-light">{dayLabel(m.at)}</span></div>;
              if (m.kind === "system") return <div key={m.id}>{sep}<motion.p initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="my-2 text-center text-xs italic text-text-light dark:text-darkmode-text-light">{m.body}</motion.p></div>;
              const same = (a?: Msg, b?: Msg) => !!a && !!b && a.kind === "text" && b.kind === "text" && a.authorId === b.authorId && Math.abs(b.at - a.at) < GAP && dayKey(a.at) === dayKey(b.at);
              const first = !same(prev, m), last = !same(m, next);
              const open = selected === m.id;
              return (
                <div key={m.id} data-mid={m.id}>
                  {sep}
                  <motion.div layout="position" initial={{ opacity: 0, y: 14, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 32 }} className={`flex items-end gap-2 ${m.mine ? "justify-end" : "justify-start"} ${first ? "mt-2.5" : "mt-0.5"}`}>
                    {isGroup && !m.mine && (last ? <Avatar name={m.author ?? "?"} size={28} /> : <span className="w-7 shrink-0" aria-hidden />)}
                    <div className={`flex min-w-0 max-w-[84%] flex-col ${m.mine ? "items-end" : "items-start"}`}>
                      <button type="button" onClick={(e) => { e.stopPropagation(); if (!m.pending) setSelected(open ? null : m.id); }} aria-expanded={open} aria-label={`Message from ${m.mine ? "you" : m.author}. Show options`} className={`bubble block max-w-full text-left ${m.mine ? "bubble-mine" : "bubble-theirs"} ${last ? "tail" : ""} ${m.failed ? "opacity-70" : ""}`}>
                        {isGroup && !m.mine && first && <span className="mb-0.5 block text-xs font-bold" style={{ color: `hsl(${[...(m.author ?? "")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0)} 60% 38%)` }}>@{m.author}</span>}
                        {m.reply && <span className="mb-1 block line-clamp-2 rounded-lg border-l-[3px] border-current bg-black/10 px-2 py-1 text-xs opacity-90"><b>@{m.reply.author}</b> {m.reply.body}</span>}
                        <span className="whitespace-pre-wrap break-words text-[15px]"><Linkify text={m.body} /></span>
                        <span className="ml-3 inline-flex translate-y-0.5 items-center gap-1 whitespace-nowrap align-bottom text-[11px] opacity-75 float-right mt-1">{clock(m.at)}{m.mine && <Ticks state={m.failed ? "failed" : m.pending ? "sending" : seen(m) ? "seen" : "sent"} />}</span>
                      </button>
                      {m.failed && <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">Not sent. <button className="underline" onClick={() => retry(m)}>Try again</button> · <button className="underline" onClick={() => setMsgs((c) => c.filter((x) => x.id !== m.id))}>Remove</button></p>}
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div initial={{ opacity: 0, height: 0, y: -4 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs font-semibold">
                              <button className="chip-btn" onClick={() => { setReplyTo(m); setSelected(null); area.current?.focus(); }}><FiCornerUpLeft aria-hidden /> Reply</button>
                              <button className="chip-btn" onClick={async () => { try { await navigator.clipboard.writeText(m.body); flash("Copied."); } catch { flash("Couldn't copy."); } setSelected(null); }}><FiCopy aria-hidden /> Copy</button>
                              {m.mine ? <button className="chip-btn !text-red-600 dark:!text-red-400" onClick={async () => { setMsgs((c) => c.filter((x) => x.id !== m.id)); setSelected(null); await deleteChatMessage(m.id); pingChats(); }}><FiTrash2 aria-hidden /> Delete</button>
                                : <button className="chip-btn" onClick={async () => { setSelected(null); await reportChatMessage(m.id); flash("Thanks, reported."); }}><FiFlag aria-hidden /> Report</button>}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {newBelow > 0 && (
            <motion.button type="button" initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} onClick={() => { toBottom(true); setNewBelow(0); void markChatRead(id).then(pingChats); }} className="absolute bottom-3 right-4 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-[color:var(--sk-ink)] shadow-lg dark:bg-darkmode-primary"><FiArrowDown aria-hidden /> {newBelow} new</motion.button>
          )}
        </AnimatePresence>
        <AnimatePresence>{note && <motion.p role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-dark px-4 py-1.5 text-sm text-white shadow-lg dark:bg-darkmode-light dark:text-darkmode-text-dark">{note}</motion.p>}</AnimatePresence>
      </div>

      {blockedHere ? (
        <p className="border-t border-border px-4 py-4 text-center text-sm dark:border-darkmode-border">{iBlocked ? <>You blocked @{title}. <button className="font-semibold underline" onClick={() => setInfo(true)}>Unblock</button> to send messages.</> : "You can't send messages in this chat."}</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-border p-2.5 dark:border-darkmode-border">
          <AnimatePresence initial={false}>
            {replyTo && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="mb-2 flex items-center justify-between gap-2 rounded-xl border-l-2 border-primary bg-light px-3 py-1.5 text-sm dark:border-darkmode-primary dark:bg-darkmode-light"><span className="truncate">Replying to <b>@{replyTo.author}</b>: {replyTo.body.slice(0, 70)}</span><button type="button" className="px-2 text-lg" aria-label="Cancel reply" onClick={() => setReplyTo(null)}>×</button></div></motion.div>}
          </AnimatePresence>
          <div className="flex items-end gap-2">
            <label htmlFor={`msg-${id}`} className="sr-only">Your message</label>
            <textarea ref={area} id={`msg-${id}`} rows={1} maxLength={MAX_MSG} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !touch) { e.preventDefault(); send(); } }} placeholder="Message" className="form-input max-h-36 min-h-[46px] grow resize-none !rounded-[22px] !py-3" />
            <motion.button type="submit" whileTap={{ scale: 0.86 }} disabled={!text.trim()} aria-label="Send message" className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-primary text-xl text-[color:var(--sk-ink)] shadow-[0_3px_0_0_var(--sk-accent-strong)] transition-opacity disabled:opacity-40 dark:bg-darkmode-primary"><FiSend aria-hidden className="-ml-0.5" /></motion.button>
          </div>
          {text.length > MAX_MSG - 200 && <p className="mt-1 text-right text-xs tabular-nums text-text-light dark:text-darkmode-text-light">{text.length}/{MAX_MSG}</p>}
        </form>
      )}

      <ChatInfoSheet open={info} onClose={() => setInfo(false)} chat={{ id, kind: initial.kind, title, ownerId, meId, members }} iBlocked={iBlocked}
        onMembers={setMembers} onRenamed={setTitle} onBlocked={setIBlocked} onGone={() => { pingChats(); router.replace("/community/chats"); }} />
    </div>
  );
}
