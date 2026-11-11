"use client";

import { addWorkoutExercise, addWorkoutSet, discardWorkout, finishWorkout, removeWorkoutExercise, removeWorkoutSet, renameWorkout, replaceWorkoutExercise, updateWorkoutExercise, updateWorkoutSet } from "@/app/actions/workouts";
import type { ExerciseLite } from "@/lib/exercises";
import { fromDisplay, toDisplay, type Units } from "@/lib/units";
import { useRouter } from "next/navigation";
import { MusicSheet } from "./MusicLinks";
import type { MusicItem } from "@/lib/music";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { soundAddSet, soundFinish, soundKind, soundMinus15, soundPlus15, soundRemoveSet, soundRestOver, soundSetDone, soundSkip, soundUntick, unlockAudio, vibrate, VIBRATE_REST_OVER, VIBRATE_SET, type FeedbackPrefs } from "@/lib/feedback";
import ExerciseImage from "./ExerciseImage";
import ExercisePicker from "./ExercisePicker";
import ExerciseSheet from "./ExerciseSheet";
import PlateCalc from "./PlateCalc";
import { suggestNext } from "@/lib/plate-calc";

export type TSet = { id: string; kind: string; weight: string; reps: string; done: boolean };
export type PastSet = { weightKg: number | null; reps: number | null; kind: string };
export type TExercise = { id: string; exerciseId: string; lite: ExerciseLite; restSeconds: number | null; repsMin: number; repsMax: number; note: string; sets: TSet[]; prev: PastSet[]; earlier?: PastSet[][] };
export type TWorkout = { id: string; name: string; startedAt: number; exercises: TExercise[] };

const KINDS = ["normal", "warmup", "drop", "failure"] as const;
const KIND_LABEL: Record<string, string> = { warmup: "W", drop: "D", failure: "F" };
const REST_PRESETS = [30, 45, 60, 90, 120, 150, 180, 240, 300];
const mmss = (s: number) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const parseNum = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isNaN(n) ? null : n; };
/** Weight box: digits, one decimal point (or comma) and a minus sign at the start (assisted machines use a minus). Nothing else gets in. */
const cleanWeight = (v: string) => { const neg = v.trimStart().startsWith("-"); const body = v.replace(/[^0-9.,]/g, ""); const i = body.search(/[.,]/); const one = i < 0 ? body : body.slice(0, i + 1) + body.slice(i + 1).replace(/[.,]/g, ""); return (neg ? "-" : "") + one; };
const dispW = (kg: number | null, units: Units) => { const v = toDisplay(kg, units); return v == null ? "" : String(v); };

/** A set only counts once it has what it needs: reps (or seconds), plus a weight unless the move is bodyweight. */
const needsWeight = (e: TExercise) => !e.lite.timed && e.lite.equipment !== "Bodyweight" && e.lite.equipment !== "No equipment";
const missing = (e: TExercise, s: Pick<TSet, "weight" | "reps">) => ({
  weight: needsWeight(e) && (parseNum(s.weight) ?? 0) === 0, // a minus weight is fine (assisted machines)
  reps: !((parseNum(s.reps) ?? 0) > 0),
});
const isReady = (e: TExercise, s: Pick<TSet, "weight" | "reps">) => { const m = missing(e, s); return !m.weight && !m.reps; };

/** A gentle line under the workout name that follows how far along you are. */
function moodLine(done: number, total: number) {
  if (total === 0) return "Add an exercise whenever you feel like it.";
  if (done === 0) return "Easy does it. Start whenever you're ready.";
  const f = done / total;
  if (f >= 1) return "All done. Lovely work. Finish when you're ready.";
  if (f >= 0.75) return "Nearly there. You're making this look easy.";
  if (f >= 0.4) return "Nice rhythm. Keep it smooth.";
  return "Good start. Breathe and keep going.";
}
const exComplete = (e: TExercise) => e.sets.length > 0 && e.sets.every((s) => s.done);

function DoneCheck({ done, burst }: { done: boolean; burst: boolean }) {
  return (
    <span className="relative flex h-full w-full items-center justify-center">
      {burst && <motion.span aria-hidden className="absolute inset-0 rounded bg-green-500" initial={{ opacity: 0.6, scale: 1 }} animate={{ opacity: 0, scale: 2 }} transition={{ duration: 0.55, ease: "easeOut" }} />}
      <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" opacity={done ? 0 : 0.45} />
        {done && <motion.path key={burst ? "draw" : "still"} d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" initial={burst ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: 0.32, ease: "easeOut", delay: burst ? 0.08 : 0 }} />}
      </svg>
    </span>
  );
}

export default function WorkoutTracker({ initial, units, defaultRest, prefs, music = [] }: { music?: MusicItem[]; initial: TWorkout; units: Units; defaultRest: number; prefs: FeedbackPrefs }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [exs, setExs] = useState(initial.exercises);
  const [now, setNow] = useState(() => Date.now());
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [autoRest, setAutoRest] = useState(true);
  const [picker, setPicker] = useState<null | { mode: "add" } | { mode: "replace"; id: string }>(null);
  const [restFor, setRestFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "finish" | "discard">(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [plateFor, setPlateFor] = useState<string | null>(null);
  const [burst, setBurst] = useState<string | null>(null);
  const [nudge, setNudge] = useState<{ id: string; weight: boolean; reps: boolean; text: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const beeped = useRef(false);

  const prefsRef = useRef(prefs);
  useEffect(() => { prefsRef.current = prefs; }, [prefs]);
  /** Play one of the action sounds, if sounds are on. */
  const fx = (f: (volume: number) => void) => { const pr = prefsRef.current; if (pr.soundEnabled) { unlockAudio(); f(pr.soundVolume); } };
  const restOverFeedback = () => {
    const pr = prefsRef.current;
    if (pr.soundEnabled) soundRestOver(pr.soundVolume);
    if (pr.vibrationEnabled) vibrate(VIBRATE_REST_OVER);
  };

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);

  // keep the screen awake during the workout so the rest timer and its alarm keep running
  useEffect(() => {
    if (!prefs.keepAwake || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null; let cancelled = false;
    const grab = async () => { try { lock = await navigator.wakeLock.request("screen"); if (cancelled) void lock.release(); } catch { /* not allowed */ } };
    const onVis = () => { if (document.visibilityState === "visible") void grab(); };
    void grab(); document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVis); void lock?.release(); };
  }, [prefs.keepAwake]);
  useEffect(() => {
    if (rest && now >= rest.endsAt) { if (!beeped.current) { beeped.current = true; restOverFeedback(); } const t = setTimeout(() => setRest(null), 2500); return () => clearTimeout(t); }
    if (rest) beeped.current = false;
  }, [now, rest]);

  const mut = useCallback((weId: string, fn: (e: TExercise) => TExercise) => setExs((cur) => cur.map((e) => (e.id === weId ? fn(e) : e))), []);
  const mutSet = (weId: string, setId: string, patch: Partial<TSet>) => mut(weId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }));

  const restOf = (e: TExercise) => e.restSeconds ?? defaultRest;

  function toggleDone(e: TExercise, s: TSet) {
    const done = !s.done;
    unlockAudio();
    if (done) {
      const m = missing(e, s);
      if (m.weight || m.reps) {
        const text = m.weight && m.reps ? "Enter the weight and reps first." : m.weight ? "Enter the weight first." : e.lite.timed ? "Enter the seconds first." : "Enter the reps first.";
        setNudge({ id: s.id, ...m, text }); window.setTimeout(() => setNudge((n) => (n?.id === s.id ? null : n)), 2600);
        return;
      }
      if (prefs.soundEnabled) soundSetDone(prefs.soundVolume);
      if (prefs.vibrationEnabled) vibrate(VIBRATE_SET);
      setBurst(s.id); window.setTimeout(() => setBurst((b) => (b === s.id ? null : b)), 800);
    }
    setNudge(null);
    mutSet(e.id, s.id, { done });
    updateWorkoutSet(s.id, { done, reps: parseNum(s.reps) == null ? null : Math.round(parseNum(s.reps)!), weightKg: fromDisplay(parseNum(s.weight), units) });
    if (done && autoRest && s.kind !== "warmup") { const total = restOf(e); beeped.current = false; setRest({ endsAt: Date.now() + total * 1000, total }); }
    if (!done) { setRest(null); fx(soundUntick); }
  }
  /** Editing a checked set so it is no longer complete (weight or reps cleared) takes the check off again. */
  function editSet(e: TExercise, s: TSet, patch: Partial<Pick<TSet, "weight" | "reps">>) {
    const stillOk = isReady(e, { ...s, ...patch });
    if (s.done && !stillOk) { mutSet(e.id, s.id, { ...patch, done: false }); updateWorkoutSet(s.id, { done: false }); }
    else mutSet(e.id, s.id, patch);
    if (nudge?.id === s.id) setNudge(null);
  }
  function fillFromLast(e: TExercise, s: TSet, p: PastSet | undefined) {
    if (!p || s.done) return;
    const patch = { weight: p.weightKg ? dispW(p.weightKg, units) : s.weight, reps: p.reps != null ? String(p.reps) : s.reps };
    mutSet(e.id, s.id, patch);
    updateWorkoutSet(s.id, { weightKg: fromDisplay(parseNum(patch.weight), units), reps: parseNum(patch.reps) == null ? null : Math.round(parseNum(patch.reps)!) });
  }
  /** Put a weight (and, if the set has none yet, a rep target) on every set that is not done or a warm-up. */
  function applyWeight(e: TExercise, w: number, reps?: number) {
    const ws = String(Math.round(w * 100) / 100);
    mut(e.id, (x) => ({ ...x, sets: x.sets.map((s) => (s.done || s.kind === "warmup" ? s : { ...s, weight: ws, reps: reps && !s.reps ? String(reps) : s.reps })) }));
    for (const s of e.sets) {
      if (s.done || s.kind === "warmup") continue;
      const r = parseNum(s.reps) ?? reps ?? null;
      updateWorkoutSet(s.id, { weightKg: fromDisplay(w, units), reps: r == null ? null : Math.round(r) });
    }
  }
  const plateEx = exs.find((x) => x.id === plateFor);
  function cycleKind(e: TExercise, s: TSet) {
    const kind = KINDS[(KINDS.indexOf(s.kind as (typeof KINDS)[number]) + 1) % KINDS.length];
    fx(soundKind); mutSet(e.id, s.id, { kind }); updateWorkoutSet(s.id, { kind });
  }
  async function addSet(e: TExercise) {
    fx(soundAddSet);
    const row = await addWorkoutSet(e.id); if (!row) return;
    mut(e.id, (x) => ({ ...x, sets: [...x.sets, { id: row.id, kind: "normal", weight: dispW(row.weightKg, units), reps: row.reps == null ? "" : String(row.reps), done: false }] }));
  }
  function removeSet(e: TExercise, s: TSet) { fx(soundRemoveSet); mut(e.id, (x) => ({ ...x, sets: x.sets.filter((y) => y.id !== s.id) })); removeWorkoutSet(s.id); }

  async function pick(l: ExerciseLite) {
    const p = picker; setPicker(null); if (!p) return;
    if (p.mode === "add") {
      const r = await addWorkoutExercise(initial.id, l.id); if (!r) return;
      setExs((cur) => [...cur, { id: r.id, exerciseId: r.exerciseId, lite: r.lite, restSeconds: null, repsMin: r.repsMin, repsMax: r.repsMax, note: "", prev: r.prev, sets: r.sets.map((s) => ({ id: s.id, kind: "normal", weight: dispW(s.weightKg, units), reps: s.reps == null ? "" : String(s.reps), done: false })) }]);
    } else {
      const r = await replaceWorkoutExercise(p.id, l.id); if (!r) return;
      mut(p.id, (e) => ({ ...e, exerciseId: l.id, lite: r.lite, prev: r.prev, sets: e.sets.map((s) => ({ ...s, done: false })) }));
    }
  }

  const done = exs.flatMap((e) => e.sets.filter((s) => s.done && s.kind !== "warmup").map((s) => ({ e, s })));
  const volumeKg = done.reduce((a, { e, s }) => a + (e.lite.timed ? 0 : Math.max(0, fromDisplay(parseNum(s.weight), units) ?? 0) * (parseNum(s.reps) ?? 0)), 0);
  const volumeDisp = Math.round(toDisplay(volumeKg, units) ?? 0);
  const totalDone = exs.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const totalSets = exs.reduce((a, e) => a + e.sets.length, 0);

  async function finish() {
    setBusy(true); setError("");
    const r = await finishWorkout(initial.id);
    setBusy(false);
    if (!r.ok) { setError(r.error); setConfirm(null); return; }
    fx(soundFinish);
    router.replace("/history?done=1");
  }
  async function discard() { setBusy(true); await discardWorkout(initial.id); router.replace("/dashboard"); }

  const remaining = rest ? Math.max(0, (rest.endsAt - now) / 1000) : 0;

  return (
    <div className="pb-28">
      <div className="session-bar sticky top-14 z-20 -mx-4 bg-body/95 px-4 pb-4 pt-3 backdrop-blur dark:bg-darkmode-body/95 lg:top-0">
        <div className="flex items-center gap-3">
          <span className="live-dot shrink-0" role="img" aria-label="Workout in progress" />
          <input aria-label="Workout name" className="min-w-0 grow !border-0 !bg-transparent !p-0 !shadow-none font-secondary text-2xl font-extrabold text-text-dark outline-none focus:underline dark:text-darkmode-text-dark" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && renameWorkout(initial.id, name)} />
          <button type="button" className="btn btn-primary btn-sm !rounded-full" onClick={() => setConfirm("finish")}>Finish</button>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={moodLine(totalDone, totalSets)} className="mood mt-0.5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>{moodLine(totalDone, totalSets)}</motion.p>
        </AnimatePresence>
        <dl className="mt-2.5 flex flex-wrap items-center gap-2 text-sm">
          <div><dt className="sr-only">Time</dt><dd className="timer-chip" suppressHydrationWarning>{mmss((now - initial.startedAt) / 1000)}</dd></div>
          <div className="stat-pill"><dt className="text-text-light dark:text-darkmode-text-light">Volume</dt><dd><b>{volumeDisp}</b> {units}</dd></div>
          <div className="stat-pill"><dt className="text-text-light dark:text-darkmode-text-light">Sets</dt><dd><b>{totalDone}/{totalSets}</b></dd></div>
          <MusicSheet links={music} />
          <label className="stat-pill ml-auto cursor-pointer"><input type="checkbox" checked={autoRest} onChange={(e) => { setAutoRest(e.target.checked); if (!e.target.checked) setRest(null); }} /> Rest timer</label>
        </dl>
        <div className="pace mt-3" aria-hidden>
          <motion.div className="pace-fill" initial={false} animate={{ width: `${totalSets ? Math.max(4, (totalDone / totalSets) * 100) : 4}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }}>
            <span className="pace-knob" />
          </motion.div>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <ol className="mt-5 space-y-6">
        <AnimatePresence initial={false}>
        {exs.map((e, ei) => (
          <motion.li key={e.id} layout="position" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }} transition={{ type: "spring", stiffness: 380, damping: 32 }} className={`ex-card ${exComplete(e) ? "is-complete" : ""}`} data-tone={(ei % 5) + 1}>
            <div className="flex items-center gap-3 p-3.5">
              <ExerciseImage id={e.exerciseId} className="ex-photo h-14 w-14" />
              <div className="min-w-0 grow">
                <button type="button" onClick={() => setSheetId(e.exerciseId)} className="block max-w-full truncate text-left font-secondary text-lg font-bold text-text-dark hover:underline dark:text-darkmode-text-dark">{e.lite.name}</button>
                <p className="flex items-center gap-2 truncate text-xs text-text-light dark:text-darkmode-text-light"><AnimatePresence>{exComplete(e) && <motion.span key="done" className="chip-done" initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 420, damping: 16 }}>✓ done</motion.span>}</AnimatePresence><span className="truncate">{e.lite.muscles} · target {e.repsMin === e.repsMax ? e.repsMin : `${e.repsMin}–${e.repsMax}`}{e.lite.timed ? " s" : " reps"}</span></p>
              </div>
              <button type="button" onClick={() => setRestFor(restFor === e.id ? null : e.id)} className="soft-btn shrink-0 !px-3 !py-1 text-sm tabular-nums" aria-label={`Rest time ${mmss(restOf(e))}. Change`}>⏱ {mmss(restOf(e))}</button>
              <button type="button" onClick={() => setPicker({ mode: "replace", id: e.id })} className="shrink-0 px-1 text-sm font-semibold underline decoration-2 underline-offset-4">Swap</button>
              <button type="button" onClick={() => { setExs((c) => c.filter((x) => x.id !== e.id)); removeWorkoutExercise(e.id); }} className="shrink-0 px-1 text-sm text-red-600 dark:text-red-400" aria-label={`Remove ${e.lite.name}`}>✕</button>
            </div>

            {restFor === e.id && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2 dark:border-darkmode-border">
                <span className="text-sm">Rest between sets:</span>
                {REST_PRESETS.map((p) => (
                  <button key={p} type="button" aria-pressed={restOf(e) === p} onClick={() => { mut(e.id, (x) => ({ ...x, restSeconds: p })); updateWorkoutExercise(e.id, { restSeconds: p }); }}
                    className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${restOf(e) === p ? "bg-primary text-[color:var(--sk-ink)] dark:bg-darkmode-primary" : "bg-light dark:bg-darkmode-light"}`}>{mmss(p)}</button>
                ))}
              </div>
            )}

            <div className="px-3 pb-1">
              <input aria-label={`Note for ${e.lite.name}`} className="w-full !rounded-xl !border-0 !bg-transparent !px-1 !shadow-none py-1 text-sm placeholder:text-text-light focus:outline-none dark:placeholder:text-darkmode-text-light" placeholder="Add a note…" value={e.note} onChange={(ev) => mut(e.id, (x) => ({ ...x, note: ev.target.value }))} onBlur={() => updateWorkoutExercise(e.id, { note: e.note || null })} />
            </div>

            {!e.lite.timed && (() => {
              const sg = suggestNext(e.prev, e.repsMin, e.repsMax, units, (kg) => toDisplay(kg, units), ({ Dumbbell: "dumbbell", Kettlebell: "kettlebells", "EZ bar": "e-z curl bar" } as Record<string, string>)[e.lite.equipment] ?? null, e.earlier);
              const canPlates = e.lite.equipment === "Barbell";
              const open = e.sets.some((x) => !x.done && x.kind !== "warmup");
              if (!sg && !canPlates) return null;
              return (
                <div className="flex flex-wrap items-center gap-2 px-3 pb-2" data-testid="suggest-row">
                  {sg && (
                    <p className={`min-w-0 grow basis-52 rounded-xl px-3 py-1.5 text-sm ${sg.kind === "up" ? "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200" : sg.kind === "down" || sg.kind === "deload" ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" : "bg-[color:var(--sk-light)]"}`}>
                      <span aria-hidden>{sg.kind === "up" ? "↑ " : sg.kind === "down" || sg.kind === "deload" ? "↓ " : "→ "}</span>{sg.text}
                      {open && <button type="button" onClick={() => applyWeight(e, sg.weight, sg.reps)} className="ml-2 font-bold underline decoration-2 underline-offset-4">Use it</button>}
                    </p>
                  )}
                  {canPlates && <button type="button" onClick={() => setPlateFor(e.id)} className="soft-btn shrink-0 !px-3 !py-1 text-sm">Plates</button>}
                </div>
              );
            })()}

            <table className="set-table table-fixed text-center">
              <thead><tr className="text-[11px] font-bold uppercase tracking-wide text-text-light dark:text-darkmode-text-light">
                <th className="w-12 py-1 font-medium">Set</th><th className="py-1 font-medium">Previous</th>
                {!e.lite.timed && <th className="w-20 py-1 font-medium">{units}</th>}<th className="w-20 py-1 font-medium">{e.lite.timed ? "Sec" : "Reps"}</th><th className="w-14 py-1"><span className="sr-only">Done</span></th><th className="w-8" />
              </tr></thead>
              <tbody>
                <AnimatePresence initial={false}>
                {e.sets.map((s, i) => {
                  const working = e.sets.slice(0, i + 1).filter((x) => x.kind === "normal" || x.kind === "failure").length;
                  const p = e.prev[Math.min(i, e.prev.length - 1)];
                  return (
                    <motion.tr key={s.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 28 }} transition={{ duration: 0.2 }} className={`set-row ${s.done ? "is-done" : ""}`}>
                      <td className="py-1.5"><button type="button" onClick={() => cycleKind(e, s)} aria-label={`Set ${i + 1}, ${s.kind}. Tap to change type`} className={`h-9 w-9 rounded font-secondary text-lg font-bold ${s.kind === "warmup" ? "text-amber-600" : s.kind === "drop" ? "text-purple-600" : s.kind === "failure" ? "text-red-600" : "text-text-dark dark:text-darkmode-text-dark"}`}>{KIND_LABEL[s.kind] ?? working}</button></td>
                      <td className="px-1">{p ? <button type="button" onClick={() => fillFromLast(e, s, p)} disabled={s.done} title="Tap to use these numbers" className="w-full truncate rounded py-1 text-sm tabular-nums text-text-light enabled:hover:bg-light enabled:active:bg-light dark:text-darkmode-text-light dark:enabled:hover:bg-darkmode-light">{e.lite.timed ? `${p.reps} s` : `${p.weightKg ? `${dispW(p.weightKg, units)} × ` : ""}${p.reps}`}</button> : <span className="text-sm text-text-light dark:text-darkmode-text-light">—</span>}</td>
                      {!e.lite.timed && <td className="px-1"><input aria-label={`Set ${i + 1} weight`} className={`form-input set-input !px-1 !py-2 text-center font-secondary text-lg ${nudge?.id === s.id && nudge.weight ? "animate-shake !border-red-500" : ""}`} inputMode="decimal" pattern="-?[0-9]*[.,]?[0-9]*" autoComplete="off" value={s.weight} placeholder={p?.weightKg ? dispW(p.weightKg, units) : "0"} onFocus={(ev) => ev.target.select()} onChange={(ev) => editSet(e, s, { weight: cleanWeight(ev.target.value) })} onBlur={() => updateWorkoutSet(s.id, { weightKg: fromDisplay(parseNum(s.weight), units) })} /></td>}
                      <td className="px-1"><input aria-label={`Set ${i + 1} ${e.lite.timed ? "seconds" : "reps"}`} className={`form-input set-input !px-1 !py-2 text-center font-secondary text-lg ${nudge?.id === s.id && nudge.reps ? "animate-shake !border-red-500" : ""}`} inputMode="numeric" value={s.reps} placeholder={String(e.repsMin)} onFocus={(ev) => ev.target.select()} onChange={(ev) => editSet(e, s, { reps: ev.target.value.replace(/\D/g, "") })} onBlur={() => updateWorkoutSet(s.id, { reps: parseNum(s.reps) == null ? null : Math.round(parseNum(s.reps)!) })} /></td>
                      <td className="px-1"><motion.button type="button" role="checkbox" aria-checked={s.done} aria-disabled={!s.done && !isReady(e, s)} aria-label={`Mark set ${i + 1} as done`} onClick={() => toggleDone(e, s)}
                        whileTap={{ scale: 0.88 }} animate={burst === s.id ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.35 }}
                        className={`set-check h-10 w-12 text-lg font-bold transition-colors duration-200 ${s.done ? "bg-green-600 text-white" : isReady(e, s) ? "border-green-500 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-light text-text-light opacity-70 dark:bg-darkmode-light"}`}><DoneCheck done={s.done} burst={burst === s.id} /></motion.button></td>
                      <td><button type="button" onClick={() => removeSet(e, s)} aria-label={`Delete set ${i + 1}`} className="px-1 text-text-light hover:text-red-600">−</button></td>
                    </motion.tr>
                  );
                })}
                </AnimatePresence>
              </tbody>
            </table>
            {nudge && e.sets.some((x) => x.id === nudge.id) && <p role="alert" className="px-3 pb-1 text-sm font-semibold text-red-600 dark:text-red-400">{nudge.text}</p>}
            <button type="button" onClick={() => addSet(e)} className="add-set">+ Add set</button>
          </motion.li>
        ))}
        </AnimatePresence>
      </ol>

      <div className="mt-6 space-y-3">
        <button type="button" className="btn btn-primary w-full !rounded-full !py-3.5 text-lg" onClick={() => setPicker({ mode: "add" })}>+ Add exercise</button>
        <button type="button" className="w-full py-2 text-sm text-red-600 underline dark:text-red-400" onClick={() => setConfirm("discard")}>Discard workout</button>
      </div>

      <AnimatePresence>
        {rest && (
          <motion.div key="rest" className="fixed inset-x-0 bottom-16 z-40 px-4 lg:bottom-4 lg:left-64" role="timer" aria-live="off" initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.96 }} transition={{ type: "spring", stiffness: 340, damping: 28 }}>
            <div className="rest-card mx-auto flex max-w-xl items-center gap-4 px-4 py-3">
              <div className="breath" aria-hidden>
                <svg viewBox="0 0 84 84" className="absolute inset-0 -rotate-90">
                  <circle cx="42" cy="42" r="36" fill="none" stroke="var(--sk-line)" strokeWidth="6" />
                  <circle cx="42" cy="42" r="36" fill="none" stroke="var(--sk-accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={226} strokeDashoffset={226 * (1 - Math.min(1, remaining / rest.total))} style={{ transition: "stroke-dashoffset 0.3s linear" }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-secondary text-xl font-extrabold tabular-nums">{mmss(remaining)}</span>
              </div>
              <div className="grow">
                <p className="font-secondary text-lg font-bold">{remaining <= 0 ? "Ready when you are" : "Rest and breathe"}</p>
                <p className="text-sm opacity-70">{remaining <= 0 ? "Next set, nice and steady." : "Shake out your arms. In through the nose, out slowly."}</p>
              </div>
              <div className="flex flex-col gap-1.5 sm:flex-row">
                <button type="button" className="soft-btn !px-3 !py-1.5 text-sm" onClick={() => { fx(soundMinus15); setRest((r) => r && { ...r, endsAt: r.endsAt - 15000 }); }}>−15s</button>
                <button type="button" className="soft-btn !px-3 !py-1.5 text-sm" onClick={() => { fx(soundPlus15); setRest((r) => r && { endsAt: r.endsAt + 15000, total: r.total + 15 }); }}>+15s</button>
              </div>
              <button type="button" className="btn btn-primary btn-sm !rounded-full" onClick={() => { fx(soundSkip); setRest(null); }}>Skip</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {confirm && (
        <div className="anim-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirm(null)}>
          <div role="alertdialog" aria-modal="true" className="anim-dialog w-full max-w-sm rounded-[28px] border-[3px] border-border bg-body p-6 shadow-2xl dark:border-darkmode-border dark:bg-darkmode-body" onClick={(ev) => ev.stopPropagation()}>
            {confirm === "finish" ? (
              <>
                <h2 className="h5 mb-2">Wrap it up?</h2>
                <p className="mb-5">{totalDone} set{totalDone === 1 ? "" : "s"} completed{totalSets - totalDone > 0 ? `. ${totalSets - totalDone} unchecked set${totalSets - totalDone === 1 ? "" : "s"} will be removed.` : "."}</p>
                <div className="flex justify-end gap-3"><button className="btn btn-outline-primary btn-sm" onClick={() => setConfirm(null)}>Keep going</button><button className="btn btn-primary btn-sm" onClick={finish} disabled={busy}>{busy ? "Saving…" : "Finish"}</button></div>
              </>
            ) : (
              <>
                <h2 className="h5 mb-2">Toss this workout?</h2>
                <p className="mb-5">Everything you logged in it will be deleted.</p>
                <div className="flex justify-end gap-3"><button className="btn btn-outline-primary btn-sm" onClick={() => setConfirm(null)}>Cancel</button><button className="btn btn-sm border-red-600 bg-red-600 text-white" onClick={discard} disabled={busy}>Discard</button></div>
              </>
            )}
          </div>
        </div>
      )}

      <PlateCalc open={!!plateEx} onClose={() => setPlateFor(null)} units={units}
        start={plateEx ? parseNum(plateEx.sets.find((x) => !x.done && x.kind !== "warmup")?.weight ?? "") ?? parseNum(plateEx.sets.at(-1)?.weight ?? "") : null}
        onUse={(w) => { if (plateEx) applyWeight(plateEx, w); }} />
      <ExerciseSheet exerciseId={sheetId} onClose={() => setSheetId(null)} onOpen={setSheetId} />
      {picker && <ExercisePicker title={picker.mode === "add" ? "Add an exercise" : "Swap exercise"} onPick={pick} onClose={() => setPicker(null)} />}
    </div>
  );
}
