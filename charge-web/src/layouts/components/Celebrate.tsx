"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

const COLORS = ["#d7262e", "#2a62d6", "#e0a400", "#1e9a56", "#7d8795"];

/** A short shower of plate-coloured confetti, then a banner. Shown after a workout is saved. */
export default function Celebrate({ title, text }: { title: string; text: string }) {
  const [show, setShow] = useState(false);
  const pieces = useMemo(() => Array.from({ length: 36 }, (_, i) => {
    const r = (n: number) => { const x = Math.sin((i + 1) * 9301 + n * 49297) * 233280; return x - Math.floor(x); };
    return { id: i, x: r(1) * 100, drift: (r(2) - 0.5) * 140, rot: (r(3) - 0.5) * 900, delay: r(4) * 0.45, dur: 1.6 + r(5) * 1.1, size: 6 + r(6) * 7, round: r(7) > 0.55, color: COLORS[i % COLORS.length] };
  }), []);
  // confetti only starts after the page has loaded in the browser (the pieces use maths that can differ between server and browser)
  useEffect(() => { setShow(true); const t = setTimeout(() => setShow(false), 3600); return () => clearTimeout(t); }, []);

  return (
    <>
      {show && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
          {pieces.map((p) => (
            <motion.span key={p.id} className="absolute top-0 block" style={{ left: `${p.x}%`, width: p.size, height: p.round ? p.size : p.size * 1.8, background: p.color, borderRadius: p.round ? "50%" : 2 }}
              initial={{ y: -30, x: 0, opacity: 1, rotate: 0 }} animate={{ y: "105vh", x: p.drift, rotate: p.rot, opacity: [1, 1, 0] }} transition={{ delay: p.delay, duration: p.dur, ease: [0.25, 0.6, 0.5, 1] }} />
          ))}
        </div>
      )}
      <motion.div role="status" className="relative mb-6 flex items-center gap-4 overflow-hidden rounded-[20px] bg-green-600 p-5 text-white shadow-[0_10px_30px_-12px_rgb(30_154_86/0.7)]"
        initial={{ opacity: 0, y: -14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
        <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/20">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.45, ease: "easeOut" }} />
          </svg>
        </span>
        <div><p className="font-secondary text-2xl font-extrabold leading-tight">{title}</p><p className="text-white/85">{text}</p></div>
      </motion.div>
    </>
  );
}
