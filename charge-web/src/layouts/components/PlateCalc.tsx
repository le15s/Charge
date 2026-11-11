"use client";

import { BAR_CHOICES, calcPlates, DEFAULT_PLATES, PLATE_SIZES, plateColorIndex } from "@/lib/plate-calc";
import { plateInkClass } from "@/lib/plates";
import type { Units } from "@/lib/units";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const KEY = "charge-plates";
type Saved = { owned?: Partial<Record<Units, number[]>>; bar?: Partial<Record<Units, number>> };
const read = (): Saved => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Saved; } catch { return {}; } };
const write = (s: Saved) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private window */ } };
const parseNum = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isNaN(n) ? null : n; };

/** One plate drawn as a slim upright disc; taller means heavier. */
function Disc({ size, units, count = 1, i }: { size: number; units: Units; count?: number; i: number }) {
  const sizes = PLATE_SIZES[units];
  const max = sizes[0];
  const h = 34 + Math.round((size / max) * 62);
  const c = plateColorIndex(size, units);
  return (
    <motion.span initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ delay: i * 0.05, type: "spring", stiffness: 380, damping: 26 }}
      className={`relative flex w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-extrabold tabular-nums shadow-sm ${plateInkClass(c)}`}
      style={{ height: h, background: `var(--pc-${c})`, transformOrigin: "center" }} aria-hidden>
      {size}
      {count > 1 && <span className="absolute -top-2 -right-2 rounded-full bg-[color:var(--sk-card)] px-1.5 text-[10px] font-bold text-[color:var(--sk-accent-text)] ring-1 ring-[color:var(--sk-line)]">×{count}</span>}
    </motion.span>
  );
}

/** Bottom sheet: type a target weight, see which plates go on each side of the bar. Remembers which plates and bar you have. */
export default function PlateCalc({ open, onClose, units, start, onUse }: { open: boolean; onClose: () => void; units: Units; start: number | null; onUse: (w: number) => void }) {
  const [mounted, setMounted] = useState(false);
  const [target, setTarget] = useState("");
  const [owned, setOwned] = useState<number[]>(DEFAULT_PLATES[units]);
  const [bar, setBar] = useState<number>(BAR_CHOICES[units][0]);
  const [custom, setCustom] = useState(false);
  const drag = useDragControls();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const s = read();
    setOwned(s.owned?.[units] ?? DEFAULT_PLATES[units]);
    setBar(s.bar?.[units] ?? BAR_CHOICES[units][0]);
    setCustom(false);
    setTarget(start ? String(start) : "");
  }, [open, units, start]);

  const persist = (o: number[], b: number) => { const s = read(); write({ owned: { ...s.owned, [units]: o }, bar: { ...s.bar, [units]: b } }); };
  const togglePlate = (p: number) => { const o = owned.includes(p) ? owned.filter((x) => x !== p) : [...owned, p]; setOwned(o); persist(o, bar); };
  const pickBar = (b: number) => { setBar(b); persist(owned, b); };

  const t = parseNum(target);
  const res = useMemo(() => (t != null && t > 0 ? calcPlates(t, bar, owned) : null), [t, bar, owned]);
  const nudge = (d: number) => setTarget(String(Math.max(0, Math.round(((t ?? bar) + d) * 100) / 100)));
  const step = units === "kg" ? 2.5 : 5;

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="plates" data-section="workouts" className="fixed inset-0 z-[60] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
          <motion.div role="dialog" aria-modal="true" aria-label="Plate calculator"
            className="relative flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-3xl bg-body shadow-2xl dark:bg-darkmode-body"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y" dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }}>
            <div className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-3" onPointerDown={(e) => drag.start(e)}><span className="h-1.5 w-12 rounded-full bg-border dark:bg-darkmode-border" /></div>
            <div className="flex items-center justify-between px-5 pb-2">
              <h2 className="h5 !mb-0">Plate calculator</h2>
              <button type="button" onClick={onClose} className="soft-btn !px-3 !py-1 text-sm">Done</button>
            </div>

            <div className="space-y-5 overflow-y-auto px-5 pb-6">
              <div>
                <label htmlFor="plate-target" className="mb-1 block text-sm font-semibold">Weight on the bar ({units})</label>
                <div className="flex items-center gap-2">
                  <button type="button" className="soft-btn !px-4 text-lg" aria-label={`Minus ${step}`} onClick={() => nudge(-step)}>−</button>
                  <input id="plate-target" inputMode="decimal" className="form-input grow text-center font-secondary text-2xl font-bold" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={String(bar + 20)} />
                  <button type="button" className="soft-btn !px-4 text-lg" aria-label={`Plus ${step}`} onClick={() => nudge(step)}>+</button>
                </div>
              </div>

              <div>
                <p className="mb-1 text-sm font-semibold">Your bar</p>
                <div className="flex flex-wrap items-center gap-2">
                  {BAR_CHOICES[units].map((b) => (
                    <button key={b} type="button" aria-pressed={bar === b && !custom} onClick={() => { setCustom(false); pickBar(b); }}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${bar === b && !custom ? "bg-[color:var(--sk-accent)] text-[color:var(--sk-ink)]" : "bg-[color:var(--sk-light)]"}`}>{b} {units}</button>
                  ))}
                  <button type="button" aria-pressed={custom} onClick={() => setCustom(true)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${custom ? "bg-[color:var(--sk-accent)] text-[color:var(--sk-ink)]" : "bg-[color:var(--sk-light)]"}`}>Other</button>
                  {custom && <input aria-label="Bar weight" inputMode="decimal" className="form-input !w-24 !py-1.5 text-center" defaultValue={bar} onChange={(e) => { const n = parseNum(e.target.value); if (n != null && n >= 0) pickBar(n); }} />}
                </div>
              </div>

              <div aria-live="polite" className="rounded-2xl border-2 border-[color:var(--sk-line)] bg-[color:var(--sk-card)] p-4">
                {!res && <p className="text-sm opacity-70">Type a weight to see what goes on each side.</p>}
                {res && res.belowBar && <p className="text-sm font-semibold">That is lighter than the bar ({bar} {units}).</p>}
                {res && !res.belowBar && (
                  <>
                    <div className="flex min-h-[110px] items-center">
                      <span className="h-3 w-10 shrink-0 rounded-l bg-[color:var(--pc-steel)]" aria-hidden />
                      <span className="h-6 w-2 shrink-0 rounded-sm bg-[color:var(--pc-steel)]" aria-hidden />
                      <div className="flex items-center gap-1 px-1">
                        {res.perSide.flatMap((p) => Array.from({ length: p.count }, (_, k) => ({ size: p.size, key: `${p.size}-${k}` }))).map((p, i) => <Disc key={p.key} size={p.size} units={units} i={i} />)}
                        {!res.perSide.length && <span className="px-2 text-sm opacity-70">Just the bar</span>}
                      </div>
                      <span className="h-3 grow rounded-r bg-[color:var(--pc-steel)]" aria-hidden />
                    </div>
                    <p className="mt-2 text-center text-xs font-bold uppercase tracking-wide opacity-60">Each side</p>
                    <p className="mt-1 text-center font-secondary text-lg font-bold" data-testid="plate-summary">
                      {res.perSide.length ? res.perSide.map((p) => `${p.count} × ${p.size}`).join(" + ") : "No plates"}
                    </p>
                    {res.leftover > 0 && <p role="status" className="mt-2 rounded-lg bg-[color:var(--sk-light)] px-3 py-2 text-center text-sm">Closest with your plates is <b>{res.total} {units}</b> ({res.leftover} {units} short). Turn on a smaller plate below to get closer.</p>}
                    <button type="button" className="btn btn-primary mt-3 w-full !rounded-full" onClick={() => { onUse(res.total); onClose(); }}>Use {res.total} {units}</button>
                  </>
                )}
              </div>

              <div>
                <p className="mb-1 text-sm font-semibold">Plates you have</p>
                <div className="flex flex-wrap gap-2">
                  {PLATE_SIZES[units].map((p) => {
                    const on = owned.includes(p); const c = plateColorIndex(p, units);
                    return (
                      <button key={p} type="button" role="switch" aria-checked={on} onClick={() => togglePlate(p)}
                        className={`flex h-11 min-w-[3.25rem] items-center justify-center rounded-lg px-2 text-sm font-extrabold tabular-nums transition ${on ? plateInkClass(c) : "bg-[color:var(--sk-light)] line-through opacity-60"}`}
                        style={on ? { background: `var(--pc-${c})` } : undefined}>{p}</button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs opacity-70">Tap a plate to say you don't have it. We remember this on this device.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
