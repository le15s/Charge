"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { PlateMark, PlateStack } from "./Decor";
import { useSection } from "./SectionShell";

type Props = { title: string; children?: ReactNode; action?: ReactNode; /** kept for older call sites; the look now comes from the section */ tone?: string };

const sub = "max-w-2xl text-text-light dark:text-darkmode-text-light";

/**
 * The heading at the top of an app page. Each section dresses it differently:
 * a whiteboard, an atlas plate, a market awning, hazard tape, a locker-room sign, a logbook cover, a control panel.
 */
export function PageHeader({ title, children, action }: Props) {
  const section = useSection();

  if (section === "workouts") {
    return (
      <header className="relative mb-8 overflow-hidden rounded-2xl bg-[#171b21] px-5 pb-6 pt-6 text-white sm:px-8 sm:pt-8">
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <h1 className="font-secondary text-[2.6rem] font-black uppercase leading-none tracking-wide text-white sm:text-6xl">{title}</h1>
            {children && <p className="mt-3 max-w-2xl text-white/75">{children}</p>}
          </div>
          {action && <div className="header-actions flex flex-wrap gap-3">{action}</div>}
        </div>
        <div aria-hidden className="mt-6 flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-plate-red" /><i className="h-2.5 w-2.5 rounded-full bg-plate-blue" /><i className="h-2.5 w-2.5 rounded-full bg-plate-yellow" /><i className="h-2.5 w-2.5 rounded-full bg-plate-green" />
          <span className="ml-2 h-px grow bg-white/15" />
        </div>
      </header>
    );
  }

  if (section === "exercises") {
    return (
      <header className="relative mb-8 border-y-[3px] border-double border-primary/45 py-6 dark:border-darkmode-primary/45">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[3.6rem] leading-[0.92] sm:text-[5.2rem]">{title}</h1>
            {children && <p className="mt-3 max-w-2xl font-secondary text-xl italic text-text-light sm:text-2xl dark:text-darkmode-text-light">{children}</p>}
          </div>
          {action && <div className="flex flex-wrap gap-3">{action}</div>}
        </div>
      </header>
    );
  }

  if (section === "food") {
    return (
      <header className="relative mb-8">
        <motion.div className="awning" aria-hidden initial={{ y: -34, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 240, damping: 15, delay: 0.1 }} />
        <div className="flex flex-wrap items-end justify-between gap-4 pt-7">
          <div className="min-w-0">
            <h1 className="text-[2.8rem] sm:text-6xl">{title}</h1>
            {children && <p className={`mt-1 ${sub}`}>{children}</p>}
          </div>
          {action && <div className="flex flex-wrap gap-3">{action}</div>}
        </div>
      </header>
    );
  }

  if (section === "stock") {
    return (
      <header className="relative mb-8">
        <motion.div className="hazard h-3 origin-left rounded-[3px]" aria-hidden initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.55, ease: [0.7, 0, 0.2, 1] }} />
        <div className="flex flex-wrap items-end justify-between gap-4 pt-5">
          <div className="min-w-0">
            <h1 className="text-[3rem] tracking-[0.01em] sm:text-6xl">{title}</h1>
            {children && <p className={`mt-1 ${sub}`}>{children}</p>}
          </div>
          {action && <div className="flex flex-wrap gap-3">{action}</div>}
        </div>
        <div aria-hidden className="mt-5 flex items-center"><span className="h-3 w-[3px] bg-border dark:bg-darkmode-border" /><span className="h-[5px] grow rounded-[1px] bg-border dark:bg-darkmode-border" /><span className="h-3 w-[3px] bg-border dark:bg-darkmode-border" /></div>
      </header>
    );
  }

  if (section === "community") {
    return (
      <motion.header className="locker-sign relative mb-8 overflow-hidden rounded-[22px] px-6 py-7 sm:px-9 sm:py-9" initial={{ opacity: 0, y: -18, rotate: -0.6 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 16 }}>
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[3rem] text-[color:var(--sk-ink)] sm:text-6xl">{title}</h1>
            {children && <p className="mt-1 max-w-2xl text-[color:var(--sk-ink)] opacity-90">{children}</p>}
          </div>
          {action && <div className="flex flex-wrap gap-3">{action}</div>}
        </div>
      </motion.header>
    );
  }

  if (section === "history") {
    return (
      <header className="relative mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[2.8rem] sm:text-6xl">{title}</h1>
            {children && <p className={`mt-2 ${sub}`}>{children}</p>}
          </div>
          {action && <div className="flex flex-wrap gap-3">{action}</div>}
        </div>
        <motion.div aria-hidden className="mt-5 h-[7px] origin-left border-y border-primary/60 dark:border-darkmode-primary/60" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </header>
    );
  }

  if (section === "gyms") {
    return (
      <header className="map-head relative mb-5 overflow-hidden rounded-[24px] px-6 py-5 sm:px-9 sm:py-6">
        <svg aria-hidden viewBox="0 0 320 160" className="pointer-events-none absolute -right-6 top-0 h-full w-[22rem] text-[color:var(--sk-ink)] opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5}>
          {[18, 36, 54, 72].map((r, i) => <motion.circle key={r} cx="230" cy="86" r={r} strokeDasharray={i === 3 ? "4 6" : undefined} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.12, duration: 0.7, ease: "easeOut" }} style={{ transformOrigin: "230px 86px" }} />)}
          <motion.path d="M20 140c40-30 70 10 110-26s60-34 100-28" strokeDasharray="5 7" strokeWidth={2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 1.2 }} />
        </svg>
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--sk-ink)] opacity-80"><span className="map-ping" aria-hidden />Live map</p>
            <h1 className="text-[2.6rem] font-bold leading-none tracking-tight text-[color:var(--sk-ink)] sm:text-5xl">{title}</h1>
            {children && <p className="mt-2 max-w-2xl text-[color:var(--sk-ink)]">{children}</p>}
          </div>
          {action && <div className="relative flex flex-wrap gap-3">{action}</div>}
        </div>
      </header>
    );
  }

  if (section === "body") {
    return (
      <header className="tape-head relative mb-6 overflow-hidden rounded-[18px] px-6 pb-8 pt-6 sm:px-9">
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--sk-ink)]">Measure twice</p>
            <h1 className="text-[2.6rem] font-bold leading-none tracking-tight text-[color:var(--sk-ink)] sm:text-5xl">{title}</h1>
            {children && <p className="mt-2 max-w-2xl text-[color:var(--sk-ink)]">{children}</p>}
          </div>
          {action && <div className="relative flex flex-wrap gap-3">{action}</div>}
        </div>
        <span aria-hidden className="tape-ticks" />
      </header>
    );
  }

  if (section === "settings" || section === "more") {
    return (
      <header className="panel-head card relative mb-8 px-6 py-6 sm:px-8">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="engrave text-[2.6rem] sm:text-5xl">{title}</h1>
            {children && <p className={`mt-1 ${sub}`}>{children}</p>}
          </div>
          <div aria-hidden className="flex items-center gap-2.5"><span className="led" /><span className="led amber" /></div>
        </div>
      </header>
    );
  }

  // home and anything else: a plate peeks in from the corner
  return (
    <header className="relative mb-8 flex flex-wrap items-end justify-between gap-4">
      <PlateMark tone="accent" className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 opacity-[0.10] sm:h-60 sm:w-60 dark:opacity-[0.14]" />
      <div className="relative min-w-0">
        <PlateStack tone="accent" className="mb-3" />
        <h1 className="h2">{title}</h1>
        {children && <p className={`mt-1 ${sub}`}>{children}</p>}
      </div>
      {action && <div className="relative flex flex-wrap gap-3">{action}</div>}
    </header>
  );
}
