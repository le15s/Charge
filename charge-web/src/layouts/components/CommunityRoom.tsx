"use client";

import { createPost, deletePost, listPosts, reportPost, type Post } from "@/app/actions/community";
import { MAX_POST } from "@/lib/community";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

const ago = (t: number) => {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function CommunityRoom({ room, hint, initial, initialMore }: { room: string; hint: string; initial: Post[]; initialMore: boolean }) {
  const [posts, setPosts] = useState<Post[]>(initial);
  const [more, setMore] = useState(initialMore);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Post | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const latest = useRef(initial.length ? initial[initial.length - 1].at : 0);
  useEffect(() => { latest.current = posts.length ? Math.max(...posts.map((p) => p.at)) : 0; }, [posts]);

  const toBottom = useCallback((smooth = false) => { const el = box.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" }); }, []);
  useEffect(() => { toBottom(); }, [toBottom]);
  useEffect(() => { if (stick.current) toBottom(true); }, [posts, toBottom]);

  // other people's new messages appear on their own
  useEffect(() => {
    const t = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const r = await listPosts(room, { after: latest.current });
      if (r.posts.length) setPosts((c) => { const have = new Set(c.map((p) => p.id)); return [...c, ...r.posts.filter((p) => !have.has(p.id))]; });
    }, 7000);
    return () => clearInterval(t);
  }, [room]);

  async function older() {
    const first = posts[0]; if (!first) return;
    const r = await listPosts(room, { before: first.at });
    const prev = box.current?.scrollHeight ?? 0;
    setPosts((c) => [...r.posts, ...c]); setMore(r.more);
    requestAnimationFrame(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight - prev; });
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true); setErr("");
    const r = await createPost(room, text, replyTo?.id);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    stick.current = true; setPosts((c) => [...c, r.post]); setText(""); setReplyTo(null);
  }

  return (
    <div className="card flex flex-col overflow-hidden">
      <div ref={box} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }} className="h-[58dvh] min-h-[320px] space-y-3 overflow-y-auto p-4" aria-live="polite" aria-label="Messages">
        {more && <div className="text-center"><button className="btn btn-outline-primary btn-sm" onClick={older}>Show earlier messages</button></div>}
        {posts.length === 0 && <p className="py-16 text-center">No messages yet. Start the conversation.</p>}
        <AnimatePresence initial={false}>
          {posts.map((p) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className={`flex flex-col ${p.mine ? "items-end" : "items-start"}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 ${p.mine ? "bg-primary text-white dark:bg-darkmode-primary dark:text-text-dark" : "bg-light text-text-dark dark:bg-darkmode-light dark:text-darkmode-text-dark"}`}>
                <p className={`mb-0.5 text-xs font-bold ${p.mine ? "opacity-80" : "text-primary dark:text-darkmode-primary"}`}>@{p.author}</p>
                {p.reply && <p className={`mb-1.5 line-clamp-2 border-l-2 pl-2 text-xs opacity-80 ${p.mine ? "border-white/60 dark:border-text-dark/50" : "border-text-light"}`}><b>@{p.reply.author}</b> {p.reply.body}</p>}
                <p className="whitespace-pre-wrap break-words text-[15px]">{p.body}</p>
              </div>
              <div className="mt-1 flex items-center gap-3 px-1 text-xs text-text-light dark:text-darkmode-text-light">
                <span>{ago(p.at)}</span>
                <button className="font-semibold hover:underline" onClick={() => { setReplyTo(p); document.getElementById("cmsg")?.focus(); }}>Reply</button>
                {!p.mine && <button className="hover:underline" onClick={async () => { await reportPost(p.id); setNote("Thanks, reported."); setTimeout(() => setNote(""), 2500); }}>Report</button>}
                {p.canDelete && <button className="text-red-600 hover:underline dark:text-red-400" onClick={async () => { setPosts((c) => c.filter((x) => x.id !== p.id)); await deletePost(p.id); }}>Delete</button>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {note && <p role="status" className="bg-light px-4 py-1.5 text-center text-sm dark:bg-darkmode-light">{note}</p>}
      <form onSubmit={send} className="border-t border-border p-3 dark:border-darkmode-border">
        {replyTo && <div className="mb-2 flex items-center justify-between rounded-lg bg-light px-3 py-1.5 text-sm dark:bg-darkmode-light"><span className="truncate">Replying to <b>@{replyTo.author}</b>: {replyTo.body.slice(0, 60)}</span><button type="button" className="px-2 text-lg" aria-label="Cancel reply" onClick={() => setReplyTo(null)}>×</button></div>}
        <div className="flex items-end gap-2">
          <label htmlFor="cmsg" className="sr-only">Your message</label>
          <textarea id="cmsg" rows={1} maxLength={MAX_POST} value={text} onChange={(e) => { setText(e.target.value); e.currentTarget.style.height = "auto"; e.currentTarget.style.height = Math.min(140, e.currentTarget.scrollHeight) + "px"; }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder={hint} className="form-input max-h-36 min-h-[48px] grow resize-none !py-3" />
          <button className="btn btn-primary shrink-0" disabled={busy || !text.trim()}>{busy ? "…" : "Send"}</button>
        </div>
        <div className="mt-1 flex justify-between text-xs text-text-light dark:text-darkmode-text-light"><span>{err ? <span role="alert" className="text-red-600">{err}</span> : "Enter to send, Shift+Enter for a new line"}</span><span className="tabular-nums">{text.length}/{MAX_POST}</span></div>
      </form>
    </div>
  );
}
