"use client";

import { fmtTimer, qtyText, type CookStep } from "@/lib/cooklang";
import { soundRestOver, unlockAudio, vibrate, VIBRATE_REST_OVER } from "@/lib/feedback";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export type CookIngredient = { name: string; text: (scale: number) => string };
type Timer = { id: number; label: string; end: number; total: number; alerted: boolean };
const mmss = (s: number) => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(s % 60).padStart(2, "0")}`; };

/** Full-screen, one step at a time, big text, with timers you can start from the step itself. */
export default function CookMode({ name, baseServings, startServings, steps, ingredients, onClose }: { name: string; baseServings: number; startServings?: number; steps: CookStep[]; ingredients: CookIngredient[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [servings, setServings] = useState(startServings ?? baseServings);
  const [showAll, setShowAll] = useState(false);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const seq = useRef(0);
  const scale = servings / baseServings;
  const step = steps[i];

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowRight") setI((x) => Math.min(steps.length - 1, x + 1)); else if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1)); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onClose, steps.length]);
  // keep the screen on while cooking
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null; let gone = false;
    const grab = async () => { try { lock = await navigator.wakeLock.request("screen"); if (gone) void lock.release(); } catch { /* not allowed */ } };
    const vis = () => { if (document.visibilityState === "visible") void grab(); };
    void grab(); document.addEventListener("visibilitychange", vis);
    return () => { gone = true; document.removeEventListener("visibilitychange", vis); void lock?.release(); };
  }, []);
  // ring when a timer finishes
  useEffect(() => {
    const done = timers.filter((t) => !t.alerted && now >= t.end);
    if (!done.length) return;
    soundRestOver(0.8); vibrate(VIBRATE_REST_OVER);
    setTimers((cur) => cur.map((t) => (done.some((d) => d.id === t.id) ? { ...t, alerted: true } : t)));
  }, [now, timers]);

  const start = (label: string, seconds: number) => {
    unlockAudio();
    if (timers.some((t) => t.label === label && !t.alerted)) return;
    setTimers((c) => [...c, { id: ++seq.current, label, end: Date.now() + seconds * 1000, total: seconds, alerted: false }]);
  };
  const stepIngs = step.tokens.filter((t) => t.t === "ing" && t.qty != null) as Extract<CookStep["tokens"][number], { t: "ing" }>[];

  return (
    <motion.div role="dialog" aria-modal="true" aria-label={`Cooking ${name}`} className="fixed inset-0 z-[70] flex flex-col bg-[color:var(--sk-bg)]" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}>
      <header className="flex items-center gap-3 border-b-2 border-[color:var(--sk-line)] px-4 py-3">
        <button className="soft-btn !px-3 !py-1.5 text-sm" onClick={onClose}>Close</button>
        <div className="min-w-0 grow"><p className="truncate font-secondary text-lg font-bold">{name}</p><p className="text-xs opacity-70">Step {i + 1} of {steps.length}</p></div>
        <div className="flex items-center gap-1" role="group" aria-label="Servings">
          <button className="soft-btn !px-3 !py-1" aria-label="Fewer servings" onClick={() => setServings((s) => Math.max(1, s - 1))}>−</button>
          <span className="min-w-14 text-center text-sm font-semibold tabular-nums" data-testid="cook-servings">{servings} {servings === 1 ? "serving" : "servings"}</span>
          <button className="soft-btn !px-3 !py-1" aria-label="More servings" onClick={() => setServings((s) => Math.min(24, s + 1))}>+</button>
        </div>
      </header>

      <div className="flex gap-1.5 px-4 pt-3" aria-hidden>{steps.map((_, n) => <span key={n} className={`h-1.5 grow rounded-full ${n <= i ? "bg-[color:var(--sk-accent)]" : "bg-[color:var(--sk-line)]"}`} />)}</div>

      <main className="mx-auto flex w-full max-w-2xl grow flex-col overflow-y-auto px-5 py-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.18 }}>
            <p className="text-2xl font-medium leading-snug sm:text-3xl" data-testid="cook-step">
              {step.tokens.map((t, k) => {
                if (t.t === "text") return <span key={k}>{t.v}</span>;
                if (t.t === "ing") return <b key={k} className="font-bold text-[color:var(--sk-accent-text)]">{t.name}{t.qty != null && <span className="ml-1 text-[0.7em] font-semibold opacity-80">({qtyText(t.qty, t.unit, scale)})</span>}</b>;
                if (t.t === "cook") return <em key={k} className="rounded bg-[color:var(--sk-light)] px-1.5 not-italic">{t.name}</em>;
                const label = t.name || fmtTimer(t.seconds);
                return <button key={k} type="button" onClick={() => start(label, t.seconds)} className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-[color:var(--sk-accent)] px-3 py-0.5 align-baseline text-[0.7em] font-bold text-[color:var(--sk-ink)] active:scale-95" aria-label={`Start a ${fmtTimer(t.seconds)} timer`}>⏱ {label === fmtTimer(t.seconds) ? label : `${label} · ${fmtTimer(t.seconds)}`}</button>;
              })}
            </p>
            {stepIngs.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Ingredients for this step">
                {stepIngs.map((t, k) => <li key={k} className="rounded-xl bg-[color:var(--sk-light)] px-3 py-1.5 text-base"><b>{qtyText(t.qty, t.unit, scale)}</b> {t.name}</li>)}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>

        <button type="button" className="mt-8 self-start text-sm font-semibold underline underline-offset-4" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>{showAll ? "Hide" : "Show"} all ingredients</button>
        {showAll && <ul className="mt-3 space-y-1 text-base" aria-label="All ingredients">{ingredients.map((g, k) => <li key={k} className="flex justify-between gap-4 border-b border-dotted border-[color:var(--sk-line)] py-1"><span>{g.name}</span><span className="font-semibold tabular-nums">{g.text(scale)}</span></li>)}</ul>}
      </main>

      {timers.length > 0 && (
        <ul className="mx-auto flex w-full max-w-2xl flex-wrap gap-2 px-4 pb-2" aria-label="Timers">
          {timers.map((t) => {
            const left = (t.end - now) / 1000; const over = left <= 0;
            return (
              <li key={t.id} className={`flex items-center gap-2 rounded-full py-1 pl-3 pr-1 text-sm font-bold ${over ? "animate-pulse bg-red-600 text-white" : "bg-[color:var(--sk-card)] ring-2 ring-[color:var(--sk-accent)]"}`} data-testid="cook-timer">
                <span className="max-w-32 truncate font-medium opacity-80">{t.label}</span><span className="tabular-nums">{over ? "Done!" : mmss(left)}</span>
                {!over && <button className="rounded-full px-2 py-0.5 text-xs opacity-70" aria-label={`Add a minute to ${t.label}`} onClick={() => setTimers((c) => c.map((x) => (x.id === t.id ? { ...x, end: x.end + 60000 } : x)))}>+1m</button>}
                <button className="rounded-full bg-black/10 px-2.5 py-0.5 dark:bg-white/15" aria-label={`Stop timer ${t.label}`} onClick={() => setTimers((c) => c.filter((x) => x.id !== t.id))}>✕</button>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="flex gap-3 border-t-2 border-[color:var(--sk-line)] bg-[color:var(--sk-card)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button className="btn btn-outline-primary w-1/3" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button>
        {i < steps.length - 1 ? <button className="btn btn-primary grow" onClick={() => setI(i + 1)}>Next step</button> : <button className="btn btn-primary grow" onClick={onClose}>All done. Enjoy!</button>}
      </footer>
    </motion.div>
  );
}
