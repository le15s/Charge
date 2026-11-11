"use client";

import { motion } from "motion/react";
import { plateVar } from "@/lib/plates";

export type PlateTone = "red" | "blue" | "yellow" | "green" | "steel";
const TONE: Record<PlateTone, string> = {
  red: "text-plate-red dark:text-darkmode-plate-red",
  blue: "text-plate-blue dark:text-darkmode-plate-blue",
  yellow: "text-plate-yellow dark:text-darkmode-plate-yellow",
  green: "text-plate-green dark:text-darkmode-plate-green",
  steel: "text-plate-steel dark:text-darkmode-plate-steel",
};
const HEIGHTS = [124, 116, 106, 96, 86, 76, 66];

/**
 * A loaded barbell: one pair of plates per workout done this week, coloured by the muscles trained
 * (every workout has its own plate colour). Empty slots stay as outlines. The plates slide on once when the page opens.
 */
export default function Barbell({ plates, slots = 7, label, onlyLastAnimates = false }: { plates: (PlateTone | number)[]; slots?: number; label: string; onlyLastAnimates?: boolean }) {
  const n = Math.min(slots, HEIGHTS.length);
  const W = 17, GAP = 4, START = 56;
  return (
    <svg viewBox="0 0 600 150" className="h-auto w-full" role="img" aria-label={label}>
      <defs>
        <pattern id="knurl" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="currentColor" opacity="0.18" /><rect width="1.4" height="4" fill="currentColor" opacity="0.45" /></pattern>
      </defs>
      {/* bar */}
      <g className="text-text-dark dark:text-darkmode-text-dark">
        <rect x="6" y="71" width="588" height="8" rx="4" fill="currentColor" opacity="0.85" />
        <rect x="190" y="71" width="220" height="8" fill="url(#knurl)" />
        <rect x="6" y="66" width="26" height="18" rx="3" fill="currentColor" opacity="0.9" />
        <rect x="568" y="66" width="26" height="18" rx="3" fill="currentColor" opacity="0.9" />
      </g>
      {Array.from({ length: n }).map((_, i) => {
        const h = HEIGHTS[i];
        const off = START + i * (W + GAP);
        const done = plates[i];
        return [1, -1].map((side) => {
          const x = side === 1 ? 300 + off : 300 - off - W;
          const common = { x, y: 75 - h / 2, width: W, height: h, rx: 3 };
          return done ? (
            <motion.g key={`${i}${side}`} className={typeof done === "string" ? TONE[done] : undefined} style={typeof done === "number" ? { color: plateVar(done) } : undefined} initial={onlyLastAnimates && i < plates.length - 1 ? false : { x: side * 160, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: onlyLastAnimates ? 0.1 : 0.15 + i * 0.12, type: "spring", stiffness: 140, damping: 16 }}>
              <rect {...common} fill="currentColor" />
              <rect x={x + 3} y={75 - h / 2 + 6} width={3} height={h - 12} rx={1.5} fill="#fff" opacity="0.35" />
            </motion.g>
          ) : (
            <rect key={`${i}${side}`} {...common} fill="none" stroke="currentColor" strokeDasharray="3 4" strokeWidth="1.4" className="text-border dark:text-darkmode-border" />
          );
        });
      })}
      {/* centre collars */}
      <g className="text-text-dark dark:text-darkmode-text-dark" opacity="0.9"><rect x="262" y="64" width="6" height="22" rx="2" fill="currentColor" /><rect x="332" y="64" width="6" height="22" rx="2" fill="currentColor" /></g>
    </svg>
  );
}
