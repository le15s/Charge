"use client";

import { saveWeight } from "@/app/actions/body";
import { fmtDay, todayStr } from "@/lib/body";
import { toDisplay, type Units } from "@/lib/units";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { LuScale } from "react-icons/lu";

const OPEN = "open-weight";
export const openWeight = () => window.dispatchEvent(new Event(OPEN));
const parse = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isNaN(n) ? null : n; };

/** A small button that shows your current weight and opens the weigh-in sheet. Use it anywhere. */
export function WeightButton({ units, kg, className = "" }: { units: Units; kg: number | null; className?: string }) {
  return (
    <button type="button" onClick={openWeight} aria-label={kg ? `Body weight ${toDisplay(kg, units)} ${units}. Change it` : "Log your body weight"}
      className={`inline-flex items-center gap-1.5 rounded-full bg-light px-3 py-1.5 text-sm font-semibold text-text-dark transition hover:brightness-95 active:scale-95 dark:bg-darkmode-light dark:text-darkmode-text-dark ${className}`}>
      <LuScale aria-hidden className="h-4 w-4" />{kg ? `${toDisplay(kg, units)} ${units}` : "Log weight"}
    </button>
  );
}

/** A plain button for a page to open the sheet. */
export function OpenWeight({ children, className = "btn btn-outline-primary btn-sm" }: { children: React.ReactNode; className?: string }) {
  return <button type="button" className={className} onClick={openWeight}>{children}</button>;
}

/** The weigh-in sheet. Mounted once in the app layout; anything can open it with `openWeight()`. */
export default function QuickWeight({ units, kg, lastDay }: { units: Units; kg: number | null; lastDay: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [val, setVal] = useState("");
  const [day, setDay] = useState(todayStr());
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const drag = useDragControls();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const show = () => { setVal(kg ? String(toDisplay(kg, units)) : ""); setDay(todayStr()); setMsg(""); setOpen(true); };
    window.addEventListener(OPEN, show);
    return () => window.removeEventListener(OPEN, show);
  }, [kg, units]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => { input.current?.focus(); input.current?.select(); }, 350);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const n = parse(val);
  const step = units === "kg" ? 0.1 : 0.2;
  const nudge = (d: number) => setVal(String(Math.round(((n ?? (kg ? toDisplay(kg, units)! : 70)) + d) * 10) / 10));
  function save(e: React.FormEvent) {
    e.preventDefault();
    if (n == null) return setMsg("Type your weight first.");
    start(async () => {
      const r = await saveWeight(day, n, units);
      if (!r.ok) return setMsg(r.error);
      setOpen(false); router.refresh();
    });
  }

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="qw" className="fixed inset-0 z-[70] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="absolute inset-0 bg-black/55" onClick={() => setOpen(false)} aria-hidden />
          <motion.form onSubmit={save} role="dialog" aria-modal="true" aria-label="Log your body weight"
            className="relative w-full max-w-md rounded-t-3xl bg-body px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-darkmode-body"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y" dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 600) setOpen(false); }}>
            <div className="flex cursor-grab touch-none justify-center pb-1 pt-3" onPointerDown={(e) => drag.start(e)}><span className="h-1.5 w-12 rounded-full bg-border dark:bg-darkmode-border" /></div>
            <div className="mb-3 flex items-center justify-between"><h2 className="h5 !mb-0">Body weight</h2><button type="button" className="soft-btn !px-3 !py-1 text-sm" onClick={() => setOpen(false)}>Cancel</button></div>
            <p className="mb-4 text-sm text-text-light dark:text-darkmode-text-light">{kg && lastDay ? `Last weigh-in: ${toDisplay(kg, units)} ${units} on ${fmtDay(lastDay)}.` : "Log your first weigh-in."}</p>
            <div className="flex items-center gap-2">
              <button type="button" className="soft-btn !px-4 text-xl" aria-label={`Minus ${step}`} onClick={() => nudge(-step)}>−</button>
              <div className="relative grow">
                <input ref={input} aria-label={`Weight in ${units}`} inputMode="decimal" className="form-input w-full text-center font-secondary text-3xl font-bold" value={val} onChange={(e) => setVal(e.target.value.replace(/[^0-9.,]/g, ""))} />
                <span aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold opacity-60">{units}</span>
              </div>
              <button type="button" className="soft-btn !px-4 text-xl" aria-label={`Plus ${step}`} onClick={() => nudge(step)}>+</button>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <label htmlFor="qw-day" className="text-sm font-semibold">Day</label>
              <input id="qw-day" type="date" max={todayStr()} className="form-input !w-auto !py-2" value={day} onChange={(e) => setDay(e.target.value)} />
            </div>
            {msg && <p role="alert" className="mt-3 text-sm text-red-600">{msg}</p>}
            <button className="btn btn-primary mt-5 w-full !rounded-full" disabled={pending}>{pending ? "Saving…" : "Save weight"}</button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
