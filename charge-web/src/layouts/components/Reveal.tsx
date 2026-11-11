"use client";

import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

/** Fades and lifts its content in once, when it scrolls into view. Switched off for people who prefer less motion. */
export default function Reveal({ children, delay = 0, className = "", as = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "li" | "section" }) {
  const M = motion[as];
  return (
    <MotionConfig reducedMotion="user">
      <M className={className} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -8% 0px" }} transition={{ duration: 0.55, delay, ease: [0.2, 0.8, 0.2, 1] }}>
        {children}
      </M>
    </MotionConfig>
  );
}
