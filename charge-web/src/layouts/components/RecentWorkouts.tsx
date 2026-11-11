"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { plateVar } from "@/lib/plates";

export type RecentRow = { id: string; name: string; when: string; minutes: number | null; sets: number; volume: string; color: number; exercises: string };

export default function RecentWorkouts({ rows }: { rows: RecentRow[] }) {
  if (!rows.length) return (
    <div className="card border-dashed p-10 text-center"><p className="font-secondary text-2xl font-extrabold text-text-dark dark:text-darkmode-text-dark">No workouts yet</p><p className="mt-1">Finish your first workout and it shows up here.</p></div>
  );
  return (
    <ol className="card divide-y divide-border overflow-hidden dark:divide-darkmode-border">
      {rows.map((r, i) => (
        <motion.li key={r.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.2 + Math.min(i, 8) * 0.04 }}
          className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
          <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: plateVar(r.color) }} aria-hidden />
          <div className="min-w-0 grow">
            <p className="truncate font-semibold text-text-dark dark:text-darkmode-text-dark">{r.name}</p>
            <p className="truncate text-sm text-text-light dark:text-darkmode-text-light">{r.exercises}</p>
          </div>
          <div className="shrink-0 text-right text-sm">
            <p className="font-semibold text-text-dark dark:text-darkmode-text-dark">{r.when}</p>
            <p className="tabular-nums text-text-light dark:text-darkmode-text-light">{r.minutes ? `${r.minutes} min · ` : ""}{r.sets} sets · {r.volume}</p>
          </div>
        </motion.li>
      ))}
      <li className="px-5 py-3 text-center"><Link href="/history" className="text-sm font-semibold text-primary hover:underline dark:text-darkmode-primary">See the full history</Link></li>
    </ol>
  );
}
