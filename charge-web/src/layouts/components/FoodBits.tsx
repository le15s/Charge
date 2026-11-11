"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, type ReactNode } from "react";

export const pill = (on: boolean, extra = "") =>
  `rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${on ? "bg-primary text-white dark:bg-darkmode-primary dark:text-text-dark" : "bg-light text-text-dark hover:bg-border dark:bg-darkmode-light dark:text-darkmode-text-dark dark:hover:bg-darkmode-border"} ${extra}`;

export const r0 = (n: number) => Math.round(n);
export const r1 = (n: number) => Math.round(n * 10) / 10;
export const parseNum = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isNaN(n) ? NaN : n; };
export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const MEALS = [{ id: "breakfast", label: "Breakfast" }, { id: "lunch", label: "Lunch" }, { id: "dinner", label: "Dinner" }, { id: "snack", label: "Snacks" }] as const;
export const defaultMeal = () => { const h = new Date().getHours(); return h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 21 ? "dinner" : "snack"; };

export type Toast = { text: string; undo?: () => void | Promise<void>; id: number };

/** Small message at the bottom with an optional Undo. Disappears by itself. */
export function ToastBar({ toast, onDone }: { toast: Toast | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, toast.undo ? 6000 : 3200);
    return () => clearTimeout(t);
  }, [toast, onDone]);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-8">
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} role="status" initial={{ y: 24, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 16, opacity: 0 }} transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full border-2 border-border bg-card py-2 pl-5 pr-2 shadow-lg dark:border-darkmode-border dark:bg-darkmode-card">
            <span className="text-sm font-semibold text-text-dark dark:text-darkmode-text-dark">{toast.text}</span>
            {toast.undo && <button className="rounded-full bg-primary px-3.5 py-1.5 text-sm font-bold text-white dark:bg-darkmode-primary dark:text-text-dark" onClick={() => { void toast.undo?.(); onDone(); }}>Undo</button>}
            <button className="px-2 text-lg text-text-light" onClick={onDone} aria-label="Dismiss">×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Bottom sheet on phones, centred dialog on desktop. */
export function Sheet({ label, title, onClose, children, wide }: { label: string; title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-label={label} initial={{ y: 70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 70, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 34 }}
        onClick={(e) => e.stopPropagation()} className={`card flex max-h-[92vh] w-full ${wide ? "max-w-2xl" : "max-w-lg"} flex-col overflow-hidden rounded-b-none sm:rounded-b-2xl`}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3 dark:border-darkmode-border"><h2 className="h5">{title}</h2><button onClick={onClose} className="px-2 text-2xl text-text-light" aria-label="Close">×</button></div>
        {children}
      </motion.div>
    </motion.div>
  );
}
