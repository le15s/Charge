"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useState } from "react";

const BEFORE = {
  verdict: "off" as const,
  rows: [["Bench press", "3 × 25", "30 s"], ["Barbell row", "3 × 25", "30 s"], ["Lateral raise", "3 × 30", "20 s"]],
  findings: [
    { level: "warn", title: "Too many reps for building muscle", text: "Sets of 25 to 30 reps are an endurance workout. Heavy enough sets in the 6 to 15 range give your muscles more to adapt to.", fix: "Raise the weight and aim for 6 to 12 reps on the big lifts." },
    { level: "tip", title: "Rests are very short", text: "At 20 to 30 seconds you will be out of breath before your muscles are tired.", fix: "Rest 1 to 2 minutes between sets." },
  ],
};
const AFTER = {
  verdict: "fits" as const,
  rows: [["Bench press", "4 × 6–10", "2 min"], ["Barbell row", "3 × 8–12", "90 s"], ["Lateral raise", "3 × 12–15", "60 s"]],
  findings: [
    { level: "good", title: "Reps match building muscle", text: "Most of your sets land between 6 and 15 reps." },
    { level: "good", title: "Rests give you time to recover", text: "Long enough to lift the same weight again." },
  ],
};
const DOT = { warn: "bg-red-500", tip: "bg-amber-500", good: "bg-emerald-500" } as const;
const WORD = { warn: "Warning", tip: "Tip", good: "Good" } as const;

/** A small before and after of Charge's goal check: a workout that doesn't fit, the advice, and the fixed version. */
export default function FitDemo() {
  const [fixed, setFixed] = useState(false);
  const d = fixed ? AFTER : BEFORE;
  const ok = d.verdict === "fits";
  return (
    <MotionConfig reducedMotion="user">
      <div className="card overflow-hidden !p-0" data-testid="fit-demo" data-fixed={fixed}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border px-5 py-4 dark:border-darkmode-border">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-light dark:text-darkmode-text-light">Your goal: build muscle</p>
            <p className="font-secondary text-2xl font-extrabold uppercase text-text-dark dark:text-darkmode-text-dark">Push day</p>
          </div>
          <motion.span key={d.verdict} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${ok ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" : "border-red-500/60 bg-red-500/10 text-red-800 dark:text-red-300"}`}>
            <span aria-hidden>{ok ? "✓ " : "! "}</span>{ok ? "Fits your goal" : "Doesn't fit your goal yet"}
          </motion.span>
        </div>
        <div className="grid md:grid-cols-2">
          <ul className="px-5 py-3 md:border-r-2 md:border-border md:dark:border-darkmode-border" aria-label="The workout">
            {d.rows.map((r) => (
              <li key={r[0]} className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2.5 last:border-0 dark:border-darkmode-border/60">
                <span className="font-semibold text-text-dark dark:text-darkmode-text-dark">{r[0]}</span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={String(fixed)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="text-right tabular-nums">
                    <span className="font-secondary text-lg font-extrabold text-text-dark dark:text-darkmode-text-dark">{r[1]}</span> <span className="text-xs text-text-light dark:text-darkmode-text-light">rest {r[2]}</span>
                  </motion.span>
                </AnimatePresence>
              </li>
            ))}
          </ul>
          <div className="px-5 py-3" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.ul key={String(fixed)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="divide-y divide-border/50 dark:divide-darkmode-border/50">
                {d.findings.map((f) => (
                  <li key={f.title} className="flex gap-3 py-2.5 text-sm">
                    <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[f.level as keyof typeof DOT]}`} />
                    <div>
                      <p className="font-semibold text-text-dark dark:text-darkmode-text-dark"><span className="sr-only">{WORD[f.level as keyof typeof WORD]}: </span>{f.title}</p>
                      <p>{f.text}</p>
                      {"fix" in f && f.fix && <p className="mt-0.5 font-semibold text-primary dark:text-darkmode-primary">→ {f.fix}</p>}
                    </div>
                  </li>
                ))}
              </motion.ul>
            </AnimatePresence>
          </div>
        </div>
        <div className="border-t-2 border-border px-5 py-3 dark:border-darkmode-border">
          <button type="button" onClick={() => setFixed((v) => !v)} className="btn btn-outline-primary btn-sm" aria-pressed={fixed}>{fixed ? "Show the first version" : "Apply the advice"}</button>
        </div>
      </div>
    </MotionConfig>
  );
}
