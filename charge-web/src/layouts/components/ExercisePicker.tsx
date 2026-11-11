"use client";

import { searchForPicker } from "@/app/actions/routines";
import type { ExerciseLite } from "@/lib/exercises";
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from "@/lib/labels";
import { useEffect, useRef, useState } from "react";
import ExerciseImage from "./ExerciseImage";

export default function ExercisePicker({ title = "Choose an exercise", onPick, onClose }: { title?: string; onPick: (e: ExerciseLite) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [items, setItems] = useState<ExerciseLite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  useEffect(() => {
    const my = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await searchForPicker(q, muscle, equipment, 0);
      if (my !== seq.current) return;
      setItems(r.items); setTotal(r.total); setLoading(false);
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, muscle, equipment]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function more() {
    const r = await searchForPicker(q, muscle, equipment, items.length);
    setItems((cur) => [...cur, ...r.items]);
  }

  return (
    <div className="anim-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="anim-sheet flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-2xl bg-body dark:bg-darkmode-body sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 dark:border-darkmode-border">
          <h2 className="h5">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-2xl leading-none">×</button>
        </div>
        <div className="space-y-3 border-b border-border p-4 dark:border-darkmode-border">
          <input autoFocus type="search" className="form-input !py-3" placeholder="Search exercises (e.g. squat, chest, dumbbell)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exercises" />
          <div className="grid grid-cols-2 gap-3">
            <select aria-label="Muscle" className="form-input !py-2" value={muscle} onChange={(e) => setMuscle(e.target.value)}>
              <option value="">All muscles</option>{Object.entries(MUSCLE_LABEL).sort((a, b) => a[1].localeCompare(b[1])).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select aria-label="Equipment" className="form-input !py-2" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
              <option value="">Any equipment</option>{Object.entries(EQUIPMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <ul className="grow overflow-y-auto p-2">
          {items.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => onPick(e)} className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left hover:bg-light dark:hover:bg-darkmode-light">
                <ExerciseImage id={e.id} />
                <span className="min-w-0"><span className="block truncate font-semibold text-text-dark dark:text-darkmode-text-dark">{e.name}</span><span className="block truncate text-sm text-text-light dark:text-darkmode-text-light">{e.muscles} · {e.equipment}</span></span>
              </button>
            </li>
          ))}
          {!loading && !items.length && <li className="p-6 text-center">No exercise matches your search.</li>}
          {loading && <li className="p-6 text-center">Loading…</li>}
          {!loading && items.length < total && <li className="p-2"><button type="button" onClick={more} className="btn btn-outline-primary w-full">Show more ({total - items.length} left)</button></li>}
        </ul>
      </div>
    </div>
  );
}
