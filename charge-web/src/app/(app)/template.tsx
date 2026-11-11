"use client";

import { MotionConfig, motion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Wraps every app page. The page fades in, then its blocks settle one after another
 * (see .page-enter in main.css). The settle effect only runs while the page is arriving.
 * Respects "reduce motion".
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const [entering, setEntering] = useState(true);
  useEffect(() => { const t = setTimeout(() => setEntering(false), 1200); return () => clearTimeout(t); }, []);
  return (
    <MotionConfig reducedMotion="user">
      <motion.div className={`page-enter ${entering ? "is-entering" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22, ease: "easeOut" }}>{children}</motion.div>
    </MotionConfig>
  );
}
