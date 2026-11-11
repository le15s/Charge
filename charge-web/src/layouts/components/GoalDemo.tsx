"use client";

import { BG, type Tone } from "./Decor";
import { GOAL_IDS, PROFILES, type GoalId, type Role } from "@/lib/goals";
import { AnimatePresence, MotionConfig, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const ROWS: { name: string; role: Role }[] = [
  { name: "Bench press", role: "main" },
  { name: "Barbell row", role: "support" },
  { name: "Overhead press", role: "support" },
  { name: "Lateral raise", role: "accessory" },
  { name: "Triceps pushdown", role: "accessory" },
];
const ROLE_TONE: Record<Role, Tone> = { main: "accent", support: "blue", accessory: "yellow" };
const ROLE_WORD: Record<Role, string> = { main: "Main lift", support: "Support", accessory: "Accessory" };
const ORDER: GoalId[] = ["muscle", "strength", "lose", "endurance", "recomp", "maintain"].filter((g): g is GoalId => (GOAL_IDS as string[]).includes(g));
const rest = (s: number) => (s >= 60 ? `${s % 60 ? (s / 60).toFixed(1).replace(".0", "") : s / 60} min` : `${s} s`);

/** The hero's moving part: the same upper-body day, rebuilt for each goal with the numbers Charge itself uses. */
export default function GoalDemo() {
  const reduce = useReducedMotion();
  const [goal, setGoal] = useState<GoalId>("muscle");
  const [auto, setAuto] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const seen = useInView(box); // the slideshow only runs while you can see it
  useEffect(() => {
    if (!auto || reduce || !seen) return;
    const t = setInterval(() => setGoal((g) => ORDER[(ORDER.indexOf(g) + 1) % ORDER.length]), 4200);
    return () => clearInterval(t);
  }, [auto, reduce, seen]);

  const p = PROFILES[goal];
  const lines = ROWS.map((r) => { const cfg = p.ideal[r.role]; const v = cfg.variants[0]; return { ...r, sets: cfg.sets, lo: v.lo, hi: v.hi, rest: v.rest }; });
  const minutes = Math.round(lines.reduce((m, l) => m + (l.sets * (40 + l.rest)) / 60, 0) / 5) * 5;

  return (
    <MotionConfig reducedMotion="user">
      <div ref={box} className="w-full" onPointerEnter={() => setAuto(false)} onFocusCapture={() => setAuto(false)} data-testid="goal-demo">
        <p id="goal-demo-label" className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-text-light dark:text-darkmode-text-light">Pick a goal, watch the workout change</p>
        <div role="group" aria-labelledby="goal-demo-label" className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
          {ORDER.map((g) => {
            const on = g === goal;
            return (
              <button key={g} type="button" aria-pressed={on} onClick={() => { setAuto(false); setGoal(g); }}
                className={`shrink-0 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition-colors ${on ? "border-primary bg-primary text-white dark:border-darkmode-primary dark:bg-darkmode-primary dark:text-darkmode-body" : "border-border text-text-dark hover:border-primary dark:border-darkmode-border dark:text-darkmode-text-dark dark:hover:border-darkmode-primary"}`}>
                {PROFILES[g].title}
              </button>
            );
          })}
        </div>

        <div className="card overflow-hidden !p-0 shadow-[0_24px_48px_-28px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]">
          <div className="flex items-start justify-between gap-3 border-b-2 border-border px-5 py-4 dark:border-darkmode-border">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-light dark:text-darkmode-text-light">Upper body A</p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p key={goal} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="mt-0.5 text-sm text-text dark:text-darkmode-text" aria-live="polite">{p.summary}</motion.p>
              </AnimatePresence>
            </div>
            <span className="shrink-0 rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300"><span aria-hidden>✓ </span>Fits your goal</span>
          </div>
          <ul className="px-5 py-2">
            {lines.map((l, i) => (
              <li key={l.name} className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-border/60 py-3 last:border-0 dark:border-darkmode-border/60">
                <div className="flex min-w-0 items-center gap-3">
                  <span aria-hidden className={`h-9 w-1.5 shrink-0 rounded-full ${BG[ROLE_TONE[l.role]]}`} />
                  <div className="min-w-0"><p className="truncate font-semibold text-text-dark dark:text-darkmode-text-dark">{l.name}</p><p className="text-xs text-text-light dark:text-darkmode-text-light">{ROLE_WORD[l.role]}</p></div>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={goal} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2, delay: i * 0.03 }} className="text-right">
                    <p className="font-secondary text-xl font-extrabold tabular-nums text-text-dark dark:text-darkmode-text-dark">{l.sets} × {l.lo === l.hi ? l.lo : `${l.lo}–${l.hi}`}</p>
                    <p className="text-xs tabular-nums text-text-light dark:text-darkmode-text-light">rest {rest(l.rest)}</p>
                  </motion.div>
                </AnimatePresence>
              </li>
            ))}
          </ul>
          <p className="border-t-2 border-border bg-light/60 px-5 py-2.5 text-xs text-text-light dark:border-darkmode-border dark:bg-darkmode-light/60 dark:text-darkmode-text-light">About {minutes} min · 5 exercises · a sample, your own plan fits your body and equipment</p>
        </div>
      </div>
    </MotionConfig>
  );
}
