"use client";

import { getExerciseSheet } from "@/app/actions/library";
import { addRoutineExercise } from "@/app/actions/routines";
import { MUSCLE_LABEL } from "@/lib/labels";
import { toDisplay } from "@/lib/units";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import ExerciseImage from "./ExerciseImage";
import ProgressChart from "./ProgressChart";

type Sheet = NonNullable<Awaited<ReturnType<typeof getExerciseSheet>>>;
type Metric = "weight" | "e1rm" | "reps";
const KIND: Record<string, string> = { warmup: "Warm-up", drop: "Drop set", failure: "To failure", normal: "" };
const dateOf = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

function Tier({ title, hint, level, muscles, tone }: { title: string; hint: string; level: 1 | 2 | 3; muscles: string[]; tone: string }) {
  if (!muscles.length) return null;
  return (
    <div className="flex gap-3">
      <div className="w-20 shrink-0">
        <p className="font-semibold text-text-dark dark:text-darkmode-text-dark">{title}</p>
        <span className="mt-1 flex gap-1" aria-hidden>{[1, 2, 3].map((n) => <span key={n} className={`h-1.5 w-4 rounded-full ${n <= level ? "bg-primary dark:bg-darkmode-primary" : "bg-border dark:bg-darkmode-border"}`} />)}</span>
        <span className="sr-only">{hint}</span>
      </div>
      <ul className="flex flex-wrap gap-1.5">{muscles.map((m) => <li key={m} className={`rounded-full px-3 py-1 text-sm font-medium ${tone}`}>{MUSCLE_LABEL[m] ?? m}</li>)}</ul>
    </div>
  );
}

/** Bottom sheet that opens on any exercise: how it is done, muscles worked, and the user's own history. */
export default function ExerciseSheet({ exerciseId, onClose, routines, onOpen }: { exerciseId: string | null; onClose: () => void; routines?: { id: string; name: string }[]; onOpen?: (id: string) => void }) {
  const [data, setData] = useState<Sheet | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [tab, setTab] = useState<"how" | "history">("how");
  const [metric, setMetric] = useState<Metric>("weight");
  const [routineId, setRoutineId] = useState(routines?.[0]?.id ?? "");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const [mounted, setMounted] = useState(false);
  const drag = useDragControls();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!exerciseId) return;
    let live = true;
    setState("loading"); setData(null); setTab("how"); setMsg("");
    getExerciseSheet(exerciseId).then((r) => {
      if (!live) return;
      if (!r) { setState("missing"); return; }
      setData(r); setState("ready");
      const hasWeight = r.sessions.some((s) => s.topKg > 0);
      setMetric(r.lite.timed || !hasWeight ? "reps" : "weight");
    }).catch(() => live && setState("missing"));
    return () => { live = false; };
  }, [exerciseId]);

  useEffect(() => {
    if (!exerciseId) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [exerciseId, onClose]);

  const hasWeight = !!data && !data.lite.timed && data.sessions.some((s) => s.topKg > 0);
  const points = useMemo(() => {
    if (!data) return [];
    return data.sessions.map((s) => ({
      at: s.at,
      value: metric === "reps" ? s.bestReps : (toDisplay(metric === "e1rm" ? s.bestE1rmKg : s.topKg, data.units) ?? 0),
    }));
  }, [data, metric]);
  const unit = !data ? "" : metric === "reps" ? (data.lite.timed ? "s" : "reps") : data.units;
  const label = metric === "reps" ? (data?.lite.timed ? "Best hold" : "Best set") : metric === "e1rm" ? "Estimated 1 rep max" : "Top weight";

  const groups = useMemo(() => {
    const g: { day: string; items: Sheet["sets"] }[] = [];
    for (const s of data?.sets ?? []) { const d = dateOf(s.at); const last = g[g.length - 1]; if (last?.day === d) last.items.push(s); else g.push({ day: d, items: [s] }); }
    return g;
  }, [data]);

  function addToRoutine() {
    if (!data || !routineId) return;
    start(async () => { const r = await addRoutineExercise(routineId, data.lite.id); setMsg(r ? `Added to ${routines?.find((x) => x.id === routineId)?.name}.` : "Could not add it. Try again."); });
  }

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {exerciseId && (
        <motion.div key="sheet" data-section="exercises" className="fixed inset-0 z-[60] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
          <motion.div role="dialog" aria-modal="true" aria-label={data?.lite.name ?? "Exercise"}
            className="relative flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-3xl bg-body shadow-2xl dark:bg-darkmode-body"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y" dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }}>
            <div className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-3" onPointerDown={(e) => drag.start(e)}><span className="h-1.5 w-12 rounded-full bg-border dark:bg-darkmode-border" /></div>

            <div className="flex shrink-0 items-center gap-3 px-5 pb-3">
              {data ? <ExerciseImage id={data.lite.id} className="h-14 w-14" /> : <span className="h-14 w-14 shrink-0 animate-pulse rounded bg-light dark:bg-darkmode-light" />}
              <div className="min-w-0 grow">
                <h2 className="h5 truncate">{data?.lite.name ?? (state === "missing" ? "Exercise not found" : "Loading…")}</h2>
                {data && <p className="truncate text-sm text-text-light dark:text-darkmode-text-light">{data.lite.equipment} · {data.lite.level}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 h-10 w-10 shrink-0 rounded-full text-2xl leading-none hover:bg-light dark:hover:bg-darkmode-light">×</button>
            </div>

            <div role="tablist" aria-label="Exercise details" className="relative mx-5 mb-1 flex shrink-0 border-b border-border dark:border-darkmode-border">
              {(["how", "history"] as const).map((t) => (
                <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={`relative px-4 py-2.5 font-semibold ${tab === t ? "text-text-dark dark:text-darkmode-text-dark" : "text-text-light dark:text-darkmode-text-light"}`}>
                  {t === "how" ? "How to" : `History${data?.totalSets ? ` (${data.totalSets})` : ""}`}
                  {tab === t && <motion.span layoutId="sheet-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-primary dark:bg-darkmode-primary" />}
                </button>
              ))}
            </div>

            <div className="grow overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
              {state === "loading" && <div className="space-y-3" aria-busy="true"><div className="h-4 w-3/4 animate-pulse rounded bg-light dark:bg-darkmode-light" /><div className="h-24 animate-pulse rounded bg-light dark:bg-darkmode-light" /><div className="h-4 w-1/2 animate-pulse rounded bg-light dark:bg-darkmode-light" /></div>}
              {state === "missing" && <p>This exercise is not in the library any more. Close this and pick another one.</p>}

              {data && tab === "how" && (
                <motion.div key="how" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <p>{data.summary}</p>
                  <div className="grid grid-cols-2 gap-3">{data.images.map((i) => <ExerciseImage key={i} id={data.lite.id} index={i} className="aspect-square h-auto w-full" />)}</div>
                  <section aria-labelledby="muscles-h" className="space-y-3">
                    <h3 id="muscles-h" className="h6">Muscles worked</h3>
                    <Tier title="Main" hint="Worked the most" level={3} muscles={data.tiers.main} tone="bg-primary text-white dark:bg-darkmode-primary dark:text-text-dark" />
                    <Tier title="Medium" hint="Helps with the lift" level={2} muscles={data.tiers.medium} tone="bg-primary/20 text-text-dark dark:bg-darkmode-primary/25 dark:text-darkmode-text-dark" />
                    <Tier title="Slight" hint="Stabilises" level={1} muscles={data.tiers.slight} tone="border border-border text-text-dark dark:border-darkmode-border dark:text-darkmode-text-dark" />
                    <p className="text-xs text-text-light dark:text-darkmode-text-light">Main and medium come from the exercise library. Slight muscles (stabilisers and grip) are estimated.</p>
                  </section>
                  {data.extras && (data.extras.desc || data.extras.aliases.length > 0 || data.extras.variationOf.length > 0) && (
                    <div className="space-y-2 text-sm" data-testid="ex-extras">
                      {data.extras.desc && <p>{data.extras.desc}</p>}
                      {data.extras.aliases.length > 0 && <p><span className="font-semibold">Also called:</span> {data.extras.aliases.join(", ")}</p>}
                      {data.extras.variationOf.length > 0 && <p className="flex flex-wrap items-center gap-1.5"><span className="font-semibold">A variation of:</span>{data.extras.variationOf.map((v) => v.id ? <button key={v.name} type="button" className="rounded-full bg-primary/15 px-2.5 py-0.5 font-medium underline-offset-2 hover:underline dark:bg-darkmode-primary/20" onClick={() => onOpen?.(v.id!)}>{v.name}</button> : <span key={v.name} className="rounded-full border border-border px-2.5 py-0.5 dark:border-darkmode-border">{v.name}</span>)}</p>}
                    </div>
                  )}
                  <section aria-labelledby="steps-h"><h3 id="steps-h" className="h6 mb-2">How to do it</h3><ol className="list-decimal space-y-2 pl-5">{data.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol></section>
                  {data.extras && data.extras.tips.length > 0 && <section aria-labelledby="tips-h"><h3 id="tips-h" className="h6 mb-2">Tips</h3><ul className="list-disc space-y-1.5 pl-5">{data.extras.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></section>}
                  {data.extras?.video && <a href={data.extras.video} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold underline decoration-2 underline-offset-4">▶ Watch a demo video <span className="text-xs font-normal opacity-70">(opens YouTube)</span></a>}
                  {routines && (routines.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4 dark:border-darkmode-border">
                      <select className="form-input !w-auto grow !py-3" value={routineId} onChange={(e) => setRoutineId(e.target.value)} aria-label="Workout">{routines.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
                      <button className="btn btn-primary" disabled={pending} onClick={addToRoutine}>Add to workout</button>
                      {msg && <p role="status" className="w-full text-sm">{msg}</p>}
                    </div>
                  ) : <p className="text-sm text-text-light dark:text-darkmode-text-light">Create a workout first, then you can add this exercise to it.</p>)}
                </motion.div>
              )}

              {data && tab === "history" && (
                <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {data.sessions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center dark:border-darkmode-border">
                      <p className="font-semibold text-text-dark dark:text-darkmode-text-dark">No sets logged yet</p>
                      <p className="mt-1 text-sm">Finish a workout that includes this exercise and your progress will show up here.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        {hasWeight && (
                          <div role="group" aria-label="Chart metric" className="mb-3 inline-flex rounded-full bg-light p-1 text-sm dark:bg-darkmode-light">
                            {([["weight", "Top weight"], ["e1rm", "Est. 1RM"], ["reps", "Reps"]] as const).map(([k, l]) => (
                              <button key={k} type="button" aria-pressed={metric === k} onClick={() => setMetric(k)} className={`rounded-full px-3 py-1 font-semibold ${metric === k ? "bg-body text-text-dark shadow dark:bg-darkmode-body dark:text-darkmode-text-dark" : "text-text-light dark:text-darkmode-text-light"}`}>{l}</button>
                            ))}
                          </div>
                        )}
                        <ProgressChart points={points} unit={unit} label={label} />
                      </div>
                      <section aria-labelledby="last-h">
                        <h3 id="last-h" className="h6 mb-2">Your last {data.sets.length} set{data.sets.length === 1 ? "" : "s"}</h3>
                        <div className="space-y-4">
                          {groups.map((g) => (
                            <div key={g.day}>
                              <p className="mb-1 text-sm font-semibold text-text-light dark:text-darkmode-text-light">{g.day}</p>
                              <ul className="divide-y divide-border rounded-xl border border-border dark:divide-darkmode-border dark:border-darkmode-border">
                                {g.items.map((s) => (
                                  <li key={s.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                                    <span className="font-secondary text-xl font-bold tabular-nums text-text-dark dark:text-darkmode-text-dark">
                                      {data.lite.timed ? `${s.reps ?? 0} s` : `${s.weightKg ? `${toDisplay(s.weightKg, data.units)} ${data.units} × ` : ""}${s.reps ?? 0}${s.weightKg ? "" : " reps"}`}
                                    </span>
                                    {KIND[s.kind] && <span className="text-sm text-text-light dark:text-darkmode-text-light">{KIND[s.kind]}</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
