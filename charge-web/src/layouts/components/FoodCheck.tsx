"use client";

import { getFoodWeek } from "@/app/actions/food";
import { analyzeDay, analyzeWeek, type DayTotal, type FoodEntryLite, type Targets, type WeightPoint } from "@/lib/analyze-food";
import { PROFILES, goalOf } from "@/lib/goals";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { FindingRow, TONE } from "./GoalFit";

/**
 * "Does what I ate fit my goal?" for the day on screen, plus a review of the last seven days.
 * The thinking lives in src/lib/analyze-food.ts. It is checked in the browser, so it updates the moment you add or remove a food.
 */
export default function FoodCheck({ day, today, goal, weightKg, diet, targets, entries }: { day: string; today: string; goal: string; weightKg: number | null; diet: string | null; targets: Targets; entries: (FoodEntryLite & { id?: string })[] }) {
  const [hour, setHour] = useState<number | null>(null);
  const [week, setWeek] = useState<{ days: DayTotal[]; weights: WeightPoint[]; goalWeightKg?: number | null } | null>(null);
  const [open, setOpen] = useState<boolean | null>(null);
  const [wOpen, setWOpen] = useState(false);
  useEffect(() => { setHour(new Date().getHours()); }, []);
  const total = useMemo(() => entries.reduce((a, e) => ({ kcal: a.kcal + e.kcal, protein: a.protein + e.protein }), { kcal: 0, protein: 0 }), [entries]);
  // fetch the week again only when the day changes, and a moment after the number of foods changes
  const count = entries.length;
  useEffect(() => {
    let live = true; const t = setTimeout(() => { getFoodWeek(day).then((r) => { if (live) setWeek(r); }).catch(() => {}); }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [day, count]);

  const final = hour != null && (day < today || hour >= 21);
  const g = goalOf(goal);
  const dayRes = useMemo(() => analyzeDay({ goal: g, weightKg, targets, entries, final, diet }), [g, weightKg, targets, entries, final, diet]);
  const weekRes = useMemo(() => {
    if (!week) return null;
    // the day on screen counts with what is on screen right now, not what was saved a moment ago
    const days = week.days.map((d) => (d.day === day ? { ...d, kcal: total.kcal, protein: total.protein, logged: count > 0 } : d));
    return analyzeWeek({ goal: g, targets, days, weights: week.weights, diet, goalWeightKg: week.goalWeightKg });
  }, [week, day, total, count, g, targets, diet]);

  if (hour == null) return null;
  const tone = TONE[dayRes.verdict];
  const warns = dayRes.findings.filter((f) => f.level === "warn").length, tips = dayRes.findings.filter((f) => f.level === "tip").length;
  const isOpen = open ?? (dayRes.verdict === "off");
  const wt = weekRes ? TONE[weekRes.verdict] : null;

  return (
    <section className="space-y-3" aria-label="Does your food fit your goal?" data-testid="food-check">
      <div className={`rounded-2xl border-2 ${dayRes.empty ? "border-border dark:border-darkmode-border" : tone.ring}`}>
        <button type="button" onClick={() => setOpen(!isOpen)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left">
          <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${dayRes.empty ? "bg-text-light" : tone.dot}`}>{dayRes.empty ? "…" : tone.icon}</span>
          <span className="min-w-0 grow">
            <span className={`block font-semibold ${dayRes.empty ? "" : tone.text}`} data-testid="food-check-headline" data-verdict={dayRes.empty ? "empty" : dayRes.verdict}>{dayRes.headline}</span>
            <span className="block truncate text-xs text-text-light dark:text-darkmode-text-light">
              {dayRes.empty ? `Add a food and I'll check it against your goal: ${PROFILES[g].title.toLowerCase()}` : `${day === today ? "Today" : "This day"}, for ${PROFILES[g].title.toLowerCase()}${warns ? ` · ${warns} warning${warns > 1 ? "s" : ""}` : ""}${tips ? ` · ${tips} tip${tips > 1 ? "s" : ""}` : ""}${!final && day === today ? " · the day isn't over" : ""}`}
            </span>
          </span>
          {!dayRes.empty && <span aria-hidden className={`shrink-0 text-lg transition-transform ${isOpen ? "rotate-180" : ""}`}>⌄</span>}
        </button>
        <AnimatePresence initial={false}>
          {isOpen && !dayRes.empty && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
              <ul className="divide-y divide-border/50 border-t border-border/60 px-4 pb-1 dark:divide-darkmode-border/50 dark:border-darkmode-border/60">{dayRes.findings.map((f) => <FindingRow key={f.id} f={f} />)}</ul>
              <p className="px-4 pb-3 pt-1 text-xs text-text-light dark:text-darkmode-text-light">Guidelines for healthy adults, not medical advice. Food names are read roughly, so ignore what doesn&apos;t apply.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {weekRes && wt && (
        <div className={`rounded-2xl border-2 ${wt.ring}`} data-testid="week-check">
          <button type="button" onClick={() => setWOpen(!wOpen)} aria-expanded={wOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left">
            <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${wt.dot}`}>{wt.icon}</span>
            <span className="min-w-0 grow">
              <span className={`block font-semibold ${wt.text}`} data-testid="week-check-headline">Your last 7 days: {weekRes.headline}</span>
              <span className="block truncate text-xs text-text-light dark:text-darkmode-text-light">
                {weekRes.daysLogged} day{weekRes.daysLogged === 1 ? "" : "s"} logged{weekRes.daysLogged >= 3 ? ` · average ${weekRes.avgKcal} kcal, ${weekRes.avgProtein} g protein` : ""}{weekRes.trendPctPerWeek != null ? ` · weight ${weekRes.trendPctPerWeek > 0 ? "+" : ""}${weekRes.trendPctPerWeek}% a week` : ""}
              </span>
            </span>
            <span aria-hidden className={`shrink-0 text-lg transition-transform ${wOpen ? "rotate-180" : ""}`}>⌄</span>
          </button>
          <AnimatePresence initial={false}>
            {wOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                <ul className="divide-y divide-border/50 border-t border-border/60 px-4 pb-3 dark:divide-darkmode-border/50 dark:border-darkmode-border/60">{weekRes.findings.map((f) => <FindingRow key={f.id} f={f} />)}</ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
