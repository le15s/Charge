"use client";

import { addRoutineExercise, deleteRoutine, moveRoutineExercise, removeRoutineExercise, renameRoutine, replaceRoutineExercise, setRoutineColor, updateRoutineExercise } from "@/app/actions/routines";
import { startWorkout } from "@/app/actions/workouts";
import type { ExerciseLite } from "@/lib/exercises";
import { PLATE_COUNT, PLATE_NAMES, plateVar } from "@/lib/plates";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import ExerciseImage from "./ExerciseImage";
import ExercisePicker from "./ExercisePicker";
import ExerciseSheet from "./ExerciseSheet";
import GoalFit from "./GoalFit";

export type EditorExercise = { id: string; exerciseId: string; sets: number; repsMin: number; repsMax: number; restSeconds: number | null; lite: ExerciseLite };

export default function RoutineEditor({ routineId, initialName, initialExercises, initialColor }: { routineId: string; initialName: string; initialExercises: EditorExercise[]; initialColor: number }) {
  const [color, setColor] = useState(initialColor);
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [rows, setRows] = useState(initialExercises);
  const [picker, setPicker] = useState<null | { mode: "add" } | { mode: "replace"; id: string }>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const patch = (id: string, data: Partial<EditorExercise>) => {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...data } : r)));
    const { sets, repsMin, repsMax, restSeconds } = data;
    start(() => updateRoutineExercise(id, { sets, repsMin, repsMax, restSeconds }));
  };
  const num = (v: string, min: number, max: number, fallback: number) => { const n = parseInt(v, 10); return isNaN(n) ? fallback : Math.min(max, Math.max(min, n)); };

  async function pick(e: ExerciseLite) {
    const p = picker; setPicker(null);
    if (!p) return;
    if (p.mode === "add") {
      const row = await addRoutineExercise(routineId, e.id);
      if (row) setRows((cur) => [...cur, { id: row.id, exerciseId: row.exerciseId, sets: row.sets, repsMin: row.repsMin, repsMax: row.repsMax, restSeconds: null, lite: row.lite }]);
    } else {
      setRows((cur) => cur.map((r) => (r.id === p.id ? { ...r, exerciseId: e.id, lite: e } : r)));
      start(() => replaceRoutineExercise(p.id, e.id));
    }
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir; if (j < 0 || j >= rows.length) return;
    const next = [...rows]; [next[i], next[j]] = [next[j], next[i]]; setRows(next);
    start(() => moveRoutineExercise(rows[i].id, dir));
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="min-w-0 grow">
          <label htmlFor="rname" className="mb-1 block text-sm text-text-light dark:text-darkmode-text-light">Workout name</label>
          <input id="rname" className="form-input !py-3 font-marker text-3xl font-normal tracking-normal" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && start(() => renameRoutine(routineId, name))} />
        </div>
        <form action={startWorkout.bind(null, routineId)}><button className="btn btn-primary" disabled={!rows.length}>Start workout</button></form>
      </div>
      <fieldset className="mb-6">
        <legend className="mb-2 text-sm text-text-light dark:text-darkmode-text-light">Plate colour <span className="hidden sm:inline">(the plate this workout adds to your barbell on Home)</span></legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Plate colour">
          {Array.from({ length: PLATE_COUNT }, (_, i) => (
            <button key={i} type="button" role="radio" aria-checked={color === i} aria-label={PLATE_NAMES[i]} title={PLATE_NAMES[i]} onClick={() => { setColor(i); start(() => setRoutineColor(routineId, i)); }}
              className={`h-8 w-8 rounded-full border-2 transition duration-200 hover:scale-110 active:scale-95 ${color === i ? "scale-110 border-text-dark ring-2 ring-offset-2 ring-offset-body dark:border-darkmode-text-dark" : "border-transparent"}`} style={{ background: plateVar(i), ...(color === i ? { ["--tw-ring-color" as string]: plateVar(i) } : {}) }} />
          ))}
        </div>
      </fieldset>

      <GoalFit className="mb-6" workouts={[{ name, exercises: rows.map((r) => ({ exerciseId: r.exerciseId, sets: r.sets, repsMin: r.repsMin, repsMax: r.repsMax, restSeconds: r.restSeconds })) }]} />

      {!rows.length && <p className="mb-4 rounded-lg border border-dashed border-border p-8 text-center dark:border-darkmode-border">No exercises yet. Add your first one.</p>}

      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.id} className="card p-4">
            <div className="flex items-start gap-3">
              <ExerciseImage id={r.exerciseId} className="h-14 w-14" />
              <div className="min-w-0 grow">
                <button type="button" onClick={() => setSheetId(r.exerciseId)} className="block max-w-full truncate text-left font-semibold text-text-dark hover:underline dark:text-darkmode-text-dark">{r.lite.name}</button>
                <p className="truncate text-sm text-text-light dark:text-darkmode-text-light">{r.lite.muscles} · {r.lite.equipment}</p>
              </div>
              <div className="flex shrink-0 gap-1 text-sm">
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="px-2 py-1 disabled:opacity-30">↑</button>
                <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="px-2 py-1 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => setPicker({ mode: "replace", id: r.id })} className="px-2 py-1 underline">Swap</button>
                <button type="button" onClick={() => { setRows((c) => c.filter((x) => x.id !== r.id)); start(() => removeRoutineExercise(r.id)); }} className="px-2 py-1 text-red-600 dark:text-red-400" aria-label={`Remove ${r.lite.name}`}>Remove</button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="text-sm">Sets<input className="form-input !px-3 !py-2" inputMode="numeric" value={r.sets} onChange={(e) => patch(r.id, { sets: num(e.target.value, 1, 15, 1) })} /></label>
              <label className="text-sm">{r.lite.timed ? "Min sec" : "Min reps"}<input className="form-input !px-3 !py-2" inputMode="numeric" value={r.repsMin} onChange={(e) => { const v = num(e.target.value, 1, 200, 1); patch(r.id, { repsMin: v, repsMax: Math.max(v, r.repsMax) }); }} /></label>
              <label className="text-sm">{r.lite.timed ? "Max sec" : "Max reps"}<input className="form-input !px-3 !py-2" inputMode="numeric" value={r.repsMax} onChange={(e) => { const v = num(e.target.value, 1, 200, 1); patch(r.id, { repsMax: v, repsMin: Math.min(v, r.repsMin) }); }} /></label>
              <label className="text-sm">Rest (sec)<input className="form-input !px-3 !py-2" inputMode="numeric" placeholder="default" value={r.restSeconds ?? ""} onChange={(e) => patch(r.id, { restSeconds: e.target.value === "" ? null : num(e.target.value, 10, 900, 90) })} /></label>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn btn-outline-primary" onClick={() => setPicker({ mode: "add" })}>+ Add exercise</button>
        {confirmDelete ? (
          <span className="flex items-center gap-3 text-sm">Delete this workout?
            <button type="button" className="btn btn-sm border-red-600 bg-red-600 text-white" onClick={async () => { await deleteRoutine(routineId); router.replace("/workouts"); }}>Yes, delete</button>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </span>
        ) : <button type="button" className="text-sm text-red-600 underline dark:text-red-400" onClick={() => setConfirmDelete(true)}>Delete workout</button>}
      </div>
      <p className="mt-4 text-sm text-text-light dark:text-darkmode-text-light" aria-live="polite">{pending ? "Saving…" : "All changes are saved automatically."}</p>

      <ExerciseSheet exerciseId={sheetId} onClose={() => setSheetId(null)} onOpen={setSheetId} />
      {picker && <ExercisePicker title={picker.mode === "add" ? "Add an exercise" : "Swap exercise"} onPick={pick} onClose={() => setPicker(null)} />}
    </div>
  );
}
