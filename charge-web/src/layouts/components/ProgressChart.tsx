"use client";

import { motion } from "motion/react";
import { useId, useMemo, useState } from "react";

export type ChartPoint = { at: number; value: number };

const W = 320, H = 150, L = 38, R = 12, T = 12, B = 24;
const day = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const fmt = (n: number, d = 1) => (Number.isInteger(n) ? String(n) : n.toFixed(d));

/** One line, one metric: how an exercise has progressed over the user's finished workouts. */
export default function ProgressChart({ points, unit, label, digits = 1 }: { points: ChartPoint[]; unit: string; label: string; digits?: number }) {
  const f = (n: number) => fmt(n, digits);
  const k = 10 ** digits;
  const id = useId();
  const [picked, setPicked] = useState<number | null>(null);
  const idx = picked ?? points.length - 1;

  const geo = useMemo(() => {
    const vals = points.map((p) => p.value);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (lo === hi) { lo = Math.max(0, lo - 1); hi = hi + 1; }
    // round the axis to friendly numbers (5, 10, 25...) so the labels read cleanly
    const raw = (hi - lo) / 3;
    const step = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 500].find((n) => n >= raw) ?? 1000;
    lo = Math.max(0, Math.floor(lo / step) * step); hi = Math.ceil(hi / step) * step;
    if (hi === lo) hi = lo + step;
    const ticks: number[] = []; for (let t = lo; t <= hi + 1e-9 && ticks.length < 6; t += step) ticks.push(t);
    const x = (i: number) => (points.length === 1 ? (L + W - R) / 2 : L + (i / (points.length - 1)) * (W - L - R));
    const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    return { x, y, ticks, d: points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ") };
  }, [points]);

  if (!points.length) return null;
  const cur = points[idx];
  const prev = idx > 0 ? points[idx - 1] : null;
  const delta = prev ? Math.round((cur.value - prev.value) * k) / k : null;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0, bd = Infinity;
    points.forEach((_, i) => { const d = Math.abs(geo.x(i) - px); if (d < bd) { bd = d; best = i; } });
    setPicked(best);
  }

  return (
    <figure aria-label={`${label} over time`}>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="font-secondary text-4xl font-bold leading-none tabular-nums text-text-dark dark:text-darkmode-text-dark">{f(cur.value)}<span className="ml-1 text-base font-semibold text-text-light dark:text-darkmode-text-light">{unit}</span></p>
          <p className="mt-1 text-sm text-text-light dark:text-darkmode-text-light">{label}, {day(cur.at)}</p>
        </div>
        {delta !== null && delta !== 0 && (
          <p className={`text-sm font-semibold tabular-nums ${delta > 0 ? "text-green-700 dark:text-green-400" : "text-text-light dark:text-darkmode-text-light"}`}>{delta > 0 ? "▲ +" : "▼ "}{f(delta)} {unit}</p>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-pan-y select-none" role="img" aria-label={`${label}: ${points.map((p) => `${day(p.at)} ${f(p.value)} ${unit}`).join(", ")}`}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setPicked(null)}>
        {geo.ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={geo.y(t)} y2={geo.y(t)} className="stroke-border dark:stroke-darkmode-border" strokeWidth={1} />
            <text x={L - 6} y={geo.y(t) + 4} textAnchor="end" className="fill-text-light text-[10px] tabular-nums dark:fill-darkmode-text-light">{fmt(t)}</text>
          </g>
        ))}
        <text x={L} y={H - 6} className="fill-text-light text-[10px] dark:fill-darkmode-text-light">{day(points[0].at)}</text>
        {points.length > 1 && <text x={W - R} y={H - 6} textAnchor="end" className="fill-text-light text-[10px] dark:fill-darkmode-text-light">{day(points[points.length - 1].at)}</text>}
        {picked !== null && <line x1={geo.x(idx)} x2={geo.x(idx)} y1={T} y2={H - B} className="stroke-text-light dark:stroke-darkmode-text-light" strokeWidth={1} strokeDasharray="3 3" />}
        {points.length > 1 && (
          <motion.path key={id + points.length} d={geo.d} fill="none" className="stroke-primary dark:stroke-darkmode-primary" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} />
        )}
        {points.map((p, i) => (
          <motion.circle key={i} cx={geo.x(i)} cy={geo.y(p.value)} r={i === idx ? 5 : 3.5} className="fill-primary stroke-body dark:fill-darkmode-primary dark:stroke-darkmode-body" strokeWidth={2}
            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + (i / points.length) * 0.6, type: "spring", stiffness: 400, damping: 20 }} style={{ transformOrigin: `${geo.x(i)}px ${geo.y(p.value)}px` }} />
        ))}
      </svg>
      {points.length === 1 && <p className="mt-1 text-sm text-text-light dark:text-darkmode-text-light">One workout so far. The line starts after your next one.</p>}
    </figure>
  );
}
