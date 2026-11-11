"use client";

import { PlateMark } from "./Decor";
import Barbell, { type PlateTone } from "./Barbell";
import GoalDemo from "./GoalDemo";
import { MotionConfig, motion } from "motion/react";
import Link from "next/link";

const FULL: PlateTone[] = ["red", "blue", "yellow", "red", "green", "blue", "steel"];
const ease = [0.2, 0.8, 0.2, 1] as const;

/** The big moment: the headline lands, a workout rebuilds itself for whichever goal you pick, and the plates slide onto the bar. */
export default function LandingHero() {
  return (
    <MotionConfig reducedMotion="user">
      <section className="relative overflow-hidden pb-6 pt-8 sm:pt-14">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[620px] bg-[radial-gradient(60%_70%_at_75%_30%,color-mix(in_srgb,var(--color-primary)_14%,transparent),transparent_70%)] dark:bg-[radial-gradient(60%_70%_at_75%_30%,color-mix(in_srgb,var(--color-darkmode-primary)_16%,transparent),transparent_70%)]" />
        <PlateMark tone="red" spin="slow" className="pointer-events-none absolute -right-36 -top-10 h-80 w-80 opacity-[0.10] sm:h-[480px] sm:w-[480px] dark:opacity-[0.14]" />
        <PlateMark tone="blue" spin="slow-rev" className="pointer-events-none absolute -left-40 top-[46%] h-72 w-72 opacity-[0.08] sm:h-[420px] sm:w-[420px] dark:opacity-[0.12]" />
        <div className="container relative">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div>
              <motion.p initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease }} className="mb-4 inline-flex items-center gap-2 rounded-full border-2 border-border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-text-dark dark:border-darkmode-border dark:text-darkmode-text-dark">
                <span aria-hidden className="h-2 w-2 rounded-full bg-primary dark:bg-darkmode-primary" />Free workout, food and stock tracker
              </motion.p>
              <h1 className="mb-5 text-[3rem] leading-[0.92] sm:text-[5.4rem]">
                <motion.span className="block" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6, ease }}>Load the bar.</motion.span>
                <motion.span className="block text-primary dark:text-darkmode-primary" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6, ease }}>Charge keeps count.</motion.span>
              </h1>
              <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5, ease }} className="mb-7 max-w-xl text-lg">
                Tell Charge your goal and it builds workouts that fit your body and equipment, checks every plan against that goal, and keeps your food and supplements on track too.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.5, ease }} className="flex flex-wrap items-center gap-3">
                <Link href="/signup" className="btn btn-primary group !px-7 !py-3 text-lg">Create a free account <span aria-hidden className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span></Link>
                <Link href="/login" className="btn btn-outline-primary !px-7 !py-3 text-lg">Log in</Link>
              </motion.div>
              <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-light dark:text-darkmode-text-light">
                {["About two minutes to set up", "kg or lb", "Light and dark", "Works on your phone"].map((t) => <li key={t} className="flex items-center gap-1.5"><span aria-hidden className="text-primary dark:text-darkmode-primary">✓</span>{t}</li>)}
              </motion.ul>
            </div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.7, ease }}>
              <GoalDemo />
            </motion.div>
          </div>
          <div className="mx-auto mt-12 max-w-3xl"><Barbell plates={FULL} label="A barbell loaded with colourful plates" /></div>
        </div>
      </section>
    </MotionConfig>
  );
}
