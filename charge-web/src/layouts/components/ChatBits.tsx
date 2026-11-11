"use client";

import { avatarHue, initialsOf } from "@/lib/chat";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FiUsers } from "react-icons/fi";

/** A round picture for a person (their initials, in a colour that is always theirs) or for a group. */
export function Avatar({ name, group, size = 44, className = "" }: { name: string; group?: boolean; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: size * 0.38 } as const;
  if (group) return <span aria-hidden style={style} className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-[color:var(--sk-ink)] dark:bg-darkmode-primary ${className}`}><FiUsers style={{ width: size * 0.46, height: size * 0.46 }} /></span>;
  return <span aria-hidden style={{ ...style, background: `hsl(${avatarHue(name)} 48% 42%)` }} className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ${className}`}>{initialsOf(name)}</span>;
}

/** Makes links in a message clickable. Everything else stays plain text. */
export function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g);
  return <>{parts.map((p, i) => (i % 2 ? <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2 break-all">{p}</a> : <span key={i}>{p}</span>))}</>;
}

/** One tick = sent, two ticks = seen by everyone else in the chat. */
export function Ticks({ state }: { state: "sending" | "sent" | "seen" | "failed" }) {
  if (state === "sending") return <svg aria-label="Sending" viewBox="0 0 16 16" className="inline h-3.5 w-3.5 opacity-70"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 4.6V8l2.2 1.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
  if (state === "failed") return <span role="img" aria-label="Not sent" className="font-bold">!</span>;
  return (
    <svg aria-label={state === "seen" ? "Seen" : "Sent"} viewBox="0 0 20 14" className={`inline h-3.5 w-4 ${state === "seen" ? "text-[#7fe4ff]" : "opacity-70"}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 7.5l3.6 3.4L12 2.8" />{state === "seen" && <path d="M8.2 10.6l.9.8L18 2.8" />}
    </svg>
  );
}

/** A bottom sheet on phones and a centred card on bigger screens. Closes on Escape or a tap outside. */
export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const prev = useRef<Element | null>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    prev.current = document.activeElement;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); (prev.current as HTMLElement | null)?.focus?.(); };
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="sheet" data-section="community" className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
          <motion.div role="dialog" aria-modal="true" aria-label={title} initial={{ y: 60, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-card shadow-2xl dark:bg-darkmode-card sm:rounded-[26px] ${wide ? "sm:max-w-xl" : "sm:max-w-md"}`}>
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
              <h2 className="h5 italic">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-light text-xl leading-none dark:bg-darkmode-light">×</button>
            </div>
            <div className="min-h-0 grow overflow-y-auto px-5 pb-6 pt-1">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Runs `fn` every `ms` milliseconds while the tab is visible, and once when it comes back. */
export function usePoll(fn: () => void | Promise<void>, ms: number, enabled = true) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  useEffect(() => {
    if (!enabled) return;
    const run = () => { if (document.visibilityState === "visible") void ref.current(); };
    const t = setInterval(run, ms);
    document.addEventListener("visibilitychange", run);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", run); };
  }, [ms, enabled]);
}

export const CHATS_CHANGED = "chats-changed";
export const pingChats = () => window.dispatchEvent(new Event(CHATS_CHANGED));
