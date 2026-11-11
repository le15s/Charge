"use client";

import { animate, useMotionValue, useTransform, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";

/** A number that counts up once when it appears. */
export default function CountUp({ to, decimals = 0, suffix = "" }: { to: number; decimals?: number; suffix?: string }) {
  const reduce = useReducedMotion();
  const v = useMotionValue(reduce ? to : 0);
  const text = useTransform(v, (n) => `${n.toFixed(decimals)}${suffix}`);
  useEffect(() => { if (reduce) { v.set(to); return; } const c = animate(v, to, { duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }); return () => c.stop(); }, [to, reduce, v]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}
