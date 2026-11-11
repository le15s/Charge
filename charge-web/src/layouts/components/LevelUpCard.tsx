"use client";

import { dismissLevelNotice } from "@/app/actions/profile";
import { LEVELS } from "@/lib/level";
import { motion } from "motion/react";
import { useState, useTransition } from "react";

/** Shown once on Home when the level went up because of the time spent training. */
export default function LevelUpCard({ level }: { level: string }) {
  const [gone, setGone] = useState(false);
  const [, start] = useTransition();
  const l = LEVELS.find((x) => x.id === level);
  if (gone || !l) return null;
  return (
    <motion.section role="status" data-testid="level-up" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="card flex flex-wrap items-center justify-between gap-4 border-2 border-primary p-5 dark:border-darkmode-primary">
      <div>
        <p className="text-sm font-semibold text-primary dark:text-darkmode-primary">Level up</p>
        <h2 className="h4 mb-1">You are now {l.title}</h2>
        <p className="text-sm">{l.text} Your next workouts from the assistant will use harder exercises and a bit more volume.</p>
      </div>
      <button className="btn btn-primary btn-sm" onClick={() => { setGone(true); start(() => { void dismissLevelNotice(); }); }}>Nice</button>
    </motion.section>
  );
}
