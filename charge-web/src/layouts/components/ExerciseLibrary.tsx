"use client";

import { searchLibrary } from "@/app/actions/library";
import type { ExerciseLite } from "@/lib/exercises";
import { CATEGORY_LABEL, EQUIPMENT_LABEL, LEVEL_LABEL, MUSCLE_LABEL } from "@/lib/labels";
import { useEffect, useRef, useState } from "react";
import ExerciseImage from "./ExerciseImage";
import ExerciseSheet from "./ExerciseSheet";

type RoutineOpt = { id: string; name: string };

export default function ExerciseLibrary({ routines }: { routines: RoutineOpt[] }) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("strength");
  const [items, setItems] = useState<ExerciseLite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const my = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await searchLibrary({ q, muscle, equipment, level, category }, 0);
      if (my !== seq.current) return;
      setItems(r.items); setTotal(r.total); setLoading(false);
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, muscle, equipment, level, category]);

  const busy = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const filters = { q, muscle, equipment, level, category };
  const latest = useRef({ filters, count: 0, total: 0, loading: true });
  latest.current = { filters, count: items.length, total, loading };

  // The next page loads by itself when you get near the bottom of the list
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(async ([entry]) => {
      const cur = latest.current;
      if (!entry.isIntersecting || busy.current || cur.loading || cur.count >= cur.total) return;
      busy.current = true; setLoadingMore(true);
      const my = seq.current;
      try {
        const r = await searchLibrary(cur.filters, cur.count);
        if (my === seq.current) setItems((prev) => { const seen = new Set(prev.map((x) => x.id)); return [...prev, ...r.items.filter((x) => !seen.has(x.id))]; });
      } finally { busy.current = false; setLoadingMore(false); }
    }, { rootMargin: "700px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [items.length, total, loading]);
  const select = "form-input !py-3";
  return (
    <div>
      <div className="mb-4">
        <input type="search" className="form-input !py-3.5 !text-lg" placeholder="Search 800+ exercises (squat, chest, dumbbell…)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exercises" />
      </div>
      <div role="group" aria-label="Muscle" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        <button type="button" className="atlas-chip" aria-pressed={muscle === ""} onClick={() => setMuscle("")}>All muscles</button>
        {Object.entries(MUSCLE_LABEL).map(([k, v]) => <button type="button" key={k} className="atlas-chip" aria-pressed={muscle === k} onClick={() => setMuscle(muscle === k ? "" : k)}>{v}</button>)}
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <select className={select} value={equipment} onChange={(e) => setEquipment(e.target.value)} aria-label="Equipment"><option value="">All equipment</option>{Object.entries(EQUIPMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className={select} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Level"><option value="">All levels</option>{Object.entries(LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className={select} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category"><option value="">All types</option>{Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      <p className="mb-4 font-secondary text-xl italic text-text-light dark:text-darkmode-text-light" aria-live="polite">{loading ? "Searching the atlas…" : `${total} plates in this volume`}</p>
      <ul className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
        {items.map((e, i) => (
          <li key={e.id}>
            <button type="button" onClick={() => setOpenId(e.id)} className="specimen card flex w-full items-center gap-4 p-3 text-left transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/50 active:scale-[0.99]">
              <span className="atlas-frame shrink-0"><ExerciseImage id={e.id} className="h-16 w-16 !rounded-none" /></span>
              <span className="min-w-0 grow">
                <span className="block truncate font-secondary text-[1.45rem] leading-tight text-text-dark dark:text-darkmode-text-dark">{e.name}</span>
                <span className="block truncate font-secondary text-lg italic text-text-light dark:text-darkmode-text-light">{e.muscles}</span>
                <span className="mt-0.5 block truncate text-[11px] uppercase tracking-[0.14em] text-text-light dark:text-darkmode-text-light">{e.equipment}</span>
              </span>
              <span className="fig-no self-start" aria-hidden>fig. {i + 1}</span>
            </button>
          </li>
        ))}
      </ul>
      {!loading && !items.length && <p className="py-12 text-center">No exercise matches. Try fewer filters.</p>}
      <div ref={sentinel} data-testid="ex-sentinel" className="mt-6 h-10 text-center text-sm text-text-light dark:text-darkmode-text-light" aria-live="polite">{loadingMore ? "Loading more…" : ""}</div>

      <ExerciseSheet exerciseId={openId} onClose={() => setOpenId(null)} routines={routines} onOpen={setOpenId} />
    </div>
  );
}
