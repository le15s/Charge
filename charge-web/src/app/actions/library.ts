"use server";

import { extrasFor } from "@/lib/exercise-extras";
import { EXERCISE_BY_ID, searchExercises, toLite } from "@/lib/exercises";
import { db } from "@/db";
import { workout, workoutExercise, workoutSet } from "@/db/schema";
import { EQUIPMENT_LABEL, LEVEL_LABEL, MUSCLE_LABEL } from "@/lib/labels";
import { muscleTiers } from "@/lib/muscles";
import { getProfile, requireUser } from "@/lib/session";
import { e1rm } from "@/lib/units";
import { and, desc, eq } from "drizzle-orm";

export async function searchLibrary(f: { q: string; muscle: string; equipment: string; level: string; category: string }, offset: number) {
  await requireUser();
  const r = searchExercises({ q: f.q, muscle: f.muscle || undefined, equipment: f.equipment || undefined, level: f.level || undefined, category: f.category || undefined }, 30, offset);
  return { total: r.total, items: r.items.map((e) => toLite(e.id)) };
}

export async function getExerciseDetail(id: string) {
  await requireUser();
  const e = EXERCISE_BY_ID[id];
  if (!e) return null;
  return {
    lite: toLite(id),
    instructions: e.instructions,
    secondary: e.secondaryMuscles,
    mechanic: e.mechanic,
    category: e.category,
    images: [0, 1],
  };
}

export type HistorySet = { id: string; at: number; weightKg: number | null; reps: number | null; kind: string };
export type HistorySession = { workoutId: string; at: number; topKg: number; bestE1rmKg: number; bestReps: number; sets: number };

/** Everything the exercise sheet shows: how-to, muscle tiers and this user's own history. */
export async function getExerciseSheet(id: string) {
  const user = await requireUser();
  const e = EXERCISE_BY_ID[id];
  if (!e) return null;
  const p = await getProfile(user.id);

  const rows = await db
    .select({ id: workoutSet.id, kind: workoutSet.kind, weightKg: workoutSet.weightKg, reps: workoutSet.reps, completedAt: workoutSet.completedAt, position: workoutSet.position, workoutId: workout.id, startedAt: workout.startedAt })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(and(eq(workout.userId, user.id), eq(workout.status, "finished"), eq(workoutExercise.exerciseId, id), eq(workoutSet.done, true)))
    .orderBy(desc(workout.startedAt), desc(workoutSet.position));

  const stamp = (r: (typeof rows)[number]) => (r.completedAt ?? r.startedAt).getTime();
  const sets: HistorySet[] = rows.slice(0, 15).map((r) => ({ id: r.id, at: stamp(r), weightKg: r.weightKg, reps: r.reps, kind: r.kind }));

  // one point per workout for the graph (warm-ups do not count as progress)
  const byWorkout = new Map<string, HistorySession>();
  for (const r of rows) {
    if (r.kind === "warmup") continue;
    const w = r.weightKg ?? 0; const reps = r.reps ?? 0;
    const s = byWorkout.get(r.workoutId) ?? { workoutId: r.workoutId, at: r.startedAt.getTime(), topKg: 0, bestE1rmKg: 0, bestReps: 0, sets: 0 };
    s.topKg = Math.max(s.topKg, w); s.bestE1rmKg = Math.max(s.bestE1rmKg, e1rm(w, reps)); s.bestReps = Math.max(s.bestReps, reps); s.sets += 1;
    byWorkout.set(r.workoutId, s);
  }
  const sessions = [...byWorkout.values()].sort((a, b) => a.at - b.at).slice(-20);

  const tiers = muscleTiers(e);
  const eq_ = e.equipment ? (EQUIPMENT_LABEL[e.equipment] ?? e.equipment) : "No equipment";
  const main = tiers.main.map((m) => MUSCLE_LABEL[m] ?? m).join(" and ");
  const summary = `${e.mechanic === "isolation" ? "An isolation" : e.mechanic === "compound" ? "A compound" : "A"} ${e.force ? `${e.force} ` : ""}exercise that mainly trains your ${main.toLowerCase()}, done with ${eq_.toLowerCase()}. ${LEVEL_LABEL[e.level]} level.`.replace(/\s+/g, " ");

  return {
    lite: toLite(id),
    summary,
    instructions: e.instructions,
    extras: extrasFor(id),
    tiers,
    images: [0, 1],
    units: (p.units === "lb" ? "lb" : "kg") as "kg" | "lb",
    sets,
    sessions,
    totalSets: rows.length,
  };
}
