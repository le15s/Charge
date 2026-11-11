"use client";

import { analyzeForGoal, type GoalFitResult } from "@/app/actions/analysis";
import type { Finding } from "@/lib/analyze-workout";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export type FitExercise = { exerciseId: string; sets: number; repsMin: number; repsMax: number; restSeconds: number | null };
export type FitWorkout = { name: string; exercises: FitExercise[] };

export const TONE = {
  fits: { ring: "border-emerald-500/50 bg-emerald-500/10", dot: "bg-emerald-500", text: "text-emerald-800 dark:text-emerald-300", icon: "✓" },
  mostly: { ring: "border-amber-500/60 bg-amber-500/10", dot: "bg-amber-500", text: "text-amber-900 dark:text-amber-200", icon: "!" },
  off: { ring: "border-red-500/60 bg-red-500/10", dot: "bg-red-500", text: "text-red-800 dark:text-red-300", icon: "!" },
} as const;
const LEVEL = {
  warn: { dot: "bg-red-500", word: "Warning" },
  tip: { dot: "bg-amber-500", word: "Tip" },
  good: { dot: "bg-emerald-500", word: "Good" },
} as const;

export function FindingRow({ f }: { f: Finding }) {
  return (
    <li className="flex gap-3 py-2.5">
      <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${LEVEL[f.level].dot}`} />
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-text-dark dark:text-darkmode-text-dark"><span className="sr-only">{LEVEL[f.level].word}: </span>{f.title}</p>
        <p className="text-text dark:text-darkmode-text">{f.text}</p>
        {f.fix && <p className="mt-0.5 font-semibold text-primary dark:text-darkmode-primary">→ {f.fix}</p>}
      </div>
    </li>
  );
}

/**
 * "Does this fit your goal?" for one workout or a whole plan. Checks again by itself a moment after anything changes.
 * The checking happens on the server (src/lib/analyze-workout.ts), against the goal and level saved in the profile.
 */
export default function GoalFit({ workouts, title = "Does it fit your goal?", defaultOpen = false, className = "" }: { workouts: FitWorkout[]; title?: string; defaultOpen?: boolean; className?: string }) {
  const [res, setRes] = useState<GoalFitResult | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [which, setWhich] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const key = JSON.stringify(workouts);
  const seq = useRef(0);
  const first = useRef(true);
  useEffect(() => {
    const id = ++seq.current;
    setBusy(true);
    const t = setTimeout(() => {
      analyzeForGoal({ workouts }).then((r) => { if (id === seq.current) { setRes(r); setBusy(false); if (first.current && r) { first.current = false; if (r.verdict === "off") setOpen(true); } } }).catch(() => { if (id === seq.current) setBusy(false); });
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!workouts.some((w) => w.exercises.length)) return null;
  if (!res) return <div className={`rounded-2xl border-2 border-border p-4 text-sm dark:border-darkmode-border ${className}`} aria-busy>Checking against your goal…</div>;
  const tone = TONE[res.verdict];
  const warns = res.workouts.flatMap((w) => w.findings).filter((f) => f.level === "warn").length + res.cycle.filter((f) => f.level === "warn").length;
  const tips = res.workouts.flatMap((w) => w.findings).filter((f) => f.level === "tip").length + res.cycle.filter((f) => f.level === "tip").length;
  const single = res.workouts.length === 1;
  const warnIds = res.workouts.flatMap((w) => w.findings).filter((f) => f.level === "warn").map((f) => f.id);
  const limitOnly = res.verdict === "off" && warnIds.length > 0 && warnIds.every((id) => id === "limit-avoid");
  const headline = limitOnly ? "Includes exercises you marked to avoid" : res.verdict === "fits" ? "Fits your goal" : res.verdict === "mostly" ? "Mostly fits your goal" : "Doesn't fit your goal yet";

  return (
    <section className={`rounded-2xl border-2 ${tone.ring} ${className}`} data-testid="goal-fit" data-verdict={res.verdict} aria-label={title}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${tone.dot}`}>{tone.icon}</span>
        <span className="min-w-0 grow">
          <span className={`block font-semibold ${tone.text}`} data-testid="goal-fit-headline">{headline}</span>
          <span className="block truncate text-xs text-text-light dark:text-darkmode-text-light">
            Checked for: {res.goalTitle}{warns ? ` · ${warns} warning${warns > 1 ? "s" : ""}` : ""}{tips ? ` · ${tips} tip${tips > 1 ? "s" : ""}` : ""}{busy ? " · updating…" : ""}
          </span>
        </span>
        <span aria-hidden className={`shrink-0 text-lg transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="border-t border-border/60 px-4 pb-3 dark:border-darkmode-border/60">
              <p className="pt-3 text-xs text-text-light dark:text-darkmode-text-light">{res.goalSummary} These are guidelines, not rules: you know your body and your week.</p>
              {single ? (
                <ul className="divide-y divide-border/50 dark:divide-darkmode-border/50">{res.workouts[0].findings.map((f) => <FindingRow key={f.id} f={f} />)}</ul>
              ) : (
                <>
                  {res.cycle.length > 0 && (<><p className="mt-3 text-xs font-bold uppercase tracking-[0.12em]">Whole plan</p><ul className="divide-y divide-border/50 dark:divide-darkmode-border/50">{res.cycle.map((f) => <FindingRow key={f.id} f={f} />)}</ul></>)}
                  <ul className="mt-2 space-y-1.5">
                    {res.workouts.map((w, i) => {
                      const t = TONE[w.verdict]; const isOpen = which === i;
                      return (
                        <li key={w.name + i} className="rounded-xl border border-border/70 dark:border-darkmode-border/70">
                          <button type="button" onClick={() => setWhich(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm">
                            <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.dot}`} />
                            <span className="min-w-0 grow truncate font-semibold">{w.name}</span>
                            <span className={`shrink-0 text-xs ${t.text}`}>{w.label}</span>
                          </button>
                          {isOpen && <ul className="divide-y divide-border/50 px-3 pb-2 dark:divide-darkmode-border/50">{w.findings.map((f) => <FindingRow key={f.id} f={f} />)}</ul>}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
