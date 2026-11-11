"use client";

import type { SectionId } from "@/lib/sections";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { PlateMark } from "./Decor";

const ink = "text-primary dark:text-darkmode-primary";
const faint = "opacity-[0.09] dark:opacity-[0.14]";

/** A line that draws itself, like a marker on a whiteboard. */
function Draw({ d, delay = 0, w = 3 }: { d: string; delay?: number; w?: number }) {
  return <motion.path d={d} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay, duration: 1.1, ease: "easeInOut" }} />;
}

function gear(cx: number, cy: number, ro: number, ri: number, teeth: number) {
  const step = (Math.PI * 2) / teeth;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    for (const [r, t] of [[ri, 0], [ro, 0.14], [ro, 0.42], [ri, 0.56]] as const) {
      const a = (i + t) * step;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
    }
  }
  return `M${pts.join("L")}Z`;
}

const BARCODE = [3, 1, 2, 1, 4, 1, 1, 2, 3, 1, 2, 4, 1, 1, 3, 2, 1, 1, 4, 2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 4];

function Art({ section }: { section: SectionId }) {
  switch (section) {
    case "workouts":
      return null; // the Workouts page stays plain: no doodles behind the cards
    case "exercises":
      return (
        <>
          <svg viewBox="0 0 500 500" className={`absolute -right-40 top-16 h-[520px] w-[520px] sm:-right-24 sm:h-[620px] sm:w-[620px] ${ink} ${faint}`} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.6}>
            {Array.from({ length: 10 }, (_, i) => <ellipse key={i} cx="250" cy="250" rx={34 + i * 24} ry={22 + i * 16} transform="rotate(-24 250 250)" />)}
            <path d="M250 20v36M250 444v36M20 250h36M444 250h36" />
          </svg>
          <svg viewBox="0 0 60 60" className={`absolute bottom-10 left-6 h-10 w-10 ${ink} ${faint}`} aria-hidden fill="none" stroke="currentColor" strokeWidth={2}><path d="M30 6v48M6 30h48" /><circle cx="30" cy="30" r="12" /></svg>
        </>
      );
    case "food":
      return (
        <svg viewBox="0 0 560 440" className={`absolute -right-32 top-20 h-[360px] w-[460px] sm:-right-10 sm:h-[470px] sm:w-[600px] ${ink} ${faint}`} aria-hidden fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="290" cy="220" r="170" /><circle cx="290" cy="220" r="128" /><circle cx="290" cy="220" r="92" strokeDasharray="3 11" />
          <path d="M60 80v86M82 80v86M104 80v86M60 166c0 30 44 30 44 0M82 196v200" />
          <path d="M516 80c26 24 30 96 0 138v178M516 80v138" />
          <path d="M232 160c20-26 56-30 82-8M300 262c22 14 52 8 64-14" />
        </svg>
      );
    case "stock":
      return (
        <svg viewBox="0 0 560 440" className={`absolute -right-24 bottom-4 h-[360px] w-[460px] sm:-right-8 sm:h-[460px] sm:w-[580px] ${ink} ${faint}`} aria-hidden fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="round">
          <rect x="30" y="250" width="200" height="150" /><path d="M30 250L230 400M230 250L30 400M30 300h200M30 350h200" />
          <rect x="250" y="290" width="160" height="110" /><path d="M250 290L410 400M410 290L250 400" />
          <rect x="90" y="110" width="170" height="140" /><path d="M90 110L260 250M260 110L90 250" />
          <g fill="currentColor" stroke="none">{(() => { let x = 430; return BARCODE.map((w, i) => { const r = <rect key={i} x={x} y="330" width={w * 1.4} height="70" opacity={i % 2 ? 0.7 : 1} />; x += w * 1.4 + 1.6; return r; }); })()}</g>
        </svg>
      );
    case "community":
      return (
        <svg viewBox="0 0 520 460" className={`absolute -right-16 top-24 h-[380px] w-[420px] sm:-right-4 sm:h-[470px] sm:w-[520px] ${ink} ${faint}`} aria-hidden fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round">
          <path d="M70 60h260a30 30 0 0 1 30 30v120a30 30 0 0 1-30 30H190l-60 54v-54H70a30 30 0 0 1-30-30V90a30 30 0 0 1 30-30z" />
          <path d="M250 250h190a30 30 0 0 1 30 30v100a30 30 0 0 1-30 30h-34v50l-62-50H250a30 30 0 0 1-30-30V280a30 30 0 0 1 30-30z" />
          <g fill="currentColor" stroke="none"><circle cx="140" cy="150" r="9" /><circle cx="190" cy="150" r="9" /><circle cx="240" cy="150" r="9" /></g>
        </svg>
      );
    case "history":
      return (
        <svg viewBox="0 0 400 400" className={`absolute -right-16 top-24 h-[330px] w-[330px] rotate-[-12deg] sm:right-4 sm:h-[400px] sm:w-[400px] ${ink} ${faint}`} aria-hidden fill="none" stroke="currentColor" strokeWidth={5}>
          <defs><path id="stampArc" d="M200 200m-132 0a132 132 0 1 1 264 0a132 132 0 1 1-264 0" /></defs>
          <circle cx="200" cy="200" r="184" /><circle cx="200" cy="200" r="104" strokeWidth={3} />
          <text fill="currentColor" stroke="none" fontSize="30" letterSpacing="5" style={{ fontFamily: "var(--font-typewriter)" }}><textPath href="#stampArc">CHARGE LOGBOOK · CHARGE LOGBOOK ·</textPath></text>
          <path d="M200 140l14 36 38 2-30 24 10 38-32-22-32 22 10-38-30-24 38-2z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "settings":
    case "more":
      return (
        <>
          <svg viewBox="0 0 440 400" className={`absolute -right-24 top-24 h-[340px] w-[380px] sm:-right-8 sm:h-[420px] sm:w-[460px] ${ink} ${faint}`} aria-hidden fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="round">
            <g className="origin-[150px_150px] animate-spin-slow-gear"><path d={gear(150, 150, 120, 98, 14)} /><circle cx="150" cy="150" r="34" /><circle cx="150" cy="150" r="8" fill="currentColor" /></g>
            <g className="origin-[330px_290px] animate-spin-slow-gear-rev"><path d={gear(330, 290, 78, 62, 10)} /><circle cx="330" cy="290" r="22" /><circle cx="330" cy="290" r="6" fill="currentColor" /></g>
          </svg>
        </>
      );
    case "gyms":
      return (
        <>
          <svg viewBox="0 0 600 500" className={`absolute -right-40 top-10 h-[520px] w-[620px] ${ink} ${faint}`} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.6}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M${60 + i * 20} ${250 - i * 18}c${40 - i * 4}-${120 - i * 12} ${180 - i * 14}-${130 - i * 10} ${260 - i * 18}-${40 - i * 4}s${60 - i * 6} ${150 - i * 14} ${-20 - i * 6} ${190 - i * 20}-${220 - i * 14} 40-${300 - i * 24} ${-30 + i * 10}-${40 - i * 4}-${80 - i * 10}-${40 - i * 4}-${120 - i * 12}z`} />)}
          </svg>
          <svg viewBox="0 0 200 200" className={`absolute bottom-16 left-4 h-40 w-40 ${ink} ${faint}`} aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="100" cy="100" r="70" /><circle cx="100" cy="100" r="46" strokeDasharray="3 8" /><path d="M100 10v30M100 160v30M10 100h30M160 100h30" /><path d="M100 60l16 40-16 12-16-12z" fill="currentColor" />
          </svg>
        </>
      );
    case "session":
      return (
        <>
          <div className="blob drift -right-24 -top-24 h-[420px] w-[420px]" style={{ background: "var(--tone-1)" }} />
          <div className="blob drift left-[-140px] top-[38%] h-[380px] w-[380px]" style={{ background: "var(--tone-4)", animationDelay: "-5s", animationDuration: "18s" }} />
          <div className="blob drift -bottom-32 right-[12%] h-[340px] w-[340px]" style={{ background: "var(--tone-3)", animationDelay: "-9s", animationDuration: "16s" }} />
        </>
      );
    default:
      return (
        <>
          <PlateMark tone="accent" spin="slow" className="absolute -right-48 top-[34%] h-[560px] w-[560px] opacity-[0.05] dark:opacity-[0.06]" />
          <PlateMark tone="blue" spin="slow-rev" className="absolute -bottom-40 -left-56 h-[600px] w-[600px] opacity-[0.045] dark:opacity-[0.05]" />
        </>
      );
  }
}

/** The faint scenery behind a section: a texture plus a few large drawings. It crossfades when you change tabs. */
export function AmbientDecor({ section }: { section: SectionId }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <AnimatePresence>
        {mounted && (
          <motion.div key={section} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.55, ease: "easeOut" }}>
            <div className="decor-pattern" data-for={section} />
            <Art section={section} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
