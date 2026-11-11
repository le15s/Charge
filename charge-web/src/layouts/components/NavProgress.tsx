"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** A thin bar at the top of the screen that fills while the next page loads. */
export default function NavProgress() {
  const path = usePathname();
  const [w, setW] = useState(0);
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const running = useRef(false);

  useEffect(() => {
    const start = () => {
      if (running.current) return;
      running.current = true; setOn(true); setW(10);
      timer.current = setInterval(() => setW((v) => v + (88 - v) * 0.12), 180);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      start();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!running.current) return;
    if (timer.current) clearInterval(timer.current);
    setW(100);
    const t = setTimeout(() => { setOn(false); running.current = false; setTimeout(() => setW(0), 250); }, 280);
    return () => clearTimeout(t);
  }, [path]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px]">
      <div className="h-full rounded-r-full bg-primary shadow-[0_0_10px_var(--sk-accent)] transition-[width,opacity] duration-300 ease-out dark:bg-darkmode-primary" style={{ width: `${w}%`, opacity: on ? 1 : 0 }} />
    </div>
  );
}
