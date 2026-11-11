import { db } from "@/db";
import { routine, routineExercise, workout, workoutExercise, workoutSet } from "@/db/schema";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { hardGroups, loadOf, recoveryLeft, type Group } from "./recovery";

export async function listRoutines(userId: string) {
  const routines = await db.select().from(routine).where(eq(routine.userId, userId)).orderBy(asc(routine.position), asc(routine.createdAt));
  if (!routines.length) return [];
  const exs = await db.select().from(routineExercise).where(inArray(routineExercise.routineId, routines.map((r) => r.id))).orderBy(asc(routineExercise.position));
  return routines.map((r) => ({ ...r, exercises: exs.filter((e) => e.routineId === r.id) }));
}

export async function getRoutine(userId: string, id: string) {
  const [r] = await db.select().from(routine).where(and(eq(routine.id, id), eq(routine.userId, userId)));
  if (!r) return null;
  const exercises = await db.select().from(routineExercise).where(eq(routineExercise.routineId, id)).orderBy(asc(routineExercise.position));
  return { ...r, exercises };
}

export type PastSet = { weightKg: number | null; reps: number | null; kind: string };

/** Most recent finished performance for each exercise. */
export async function lastPerformance(userId: string, exerciseIds: string[]) {
  const out: Record<string, PastSet[]> = {};
  if (!exerciseIds.length) return out;
  const rows = await db
    .select({ exerciseId: workoutExercise.exerciseId, weId: workoutExercise.id, startedAt: workout.startedAt })
    .from(workoutExercise)
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(and(eq(workout.userId, userId), eq(workout.status, "finished"), inArray(workoutExercise.exerciseId, exerciseIds)))
    .orderBy(desc(workout.startedAt));
  const pick: Record<string, string> = {};
  for (const r of rows) if (!pick[r.exerciseId]) pick[r.exerciseId] = r.weId;
  const ids = Object.values(pick);
  if (!ids.length) return out;
  const sets = await db.select().from(workoutSet).where(and(inArray(workoutSet.workoutExerciseId, ids), eq(workoutSet.done, true))).orderBy(asc(workoutSet.position));
  for (const [exId, weId] of Object.entries(pick)) out[exId] = sets.filter((s) => s.workoutExerciseId === weId && s.kind !== "warmup").map((s) => ({ weightKg: s.weightKg, reps: s.reps, kind: s.kind }));
  return out;
}

/** The two finished sessions before the latest one, per exercise (newest first). Used to spot a stall. */
export async function earlierPerformances(userId: string, exerciseIds: string[]) {
  const out: Record<string, PastSet[][]> = {};
  if (!exerciseIds.length) return out;
  const rows = await db
    .select({ exerciseId: workoutExercise.exerciseId, weId: workoutExercise.id })
    .from(workoutExercise)
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(and(eq(workout.userId, userId), eq(workout.status, "finished"), inArray(workoutExercise.exerciseId, exerciseIds)))
    .orderBy(desc(workout.startedAt));
  const seen: Record<string, string[]> = {};
  for (const r of rows) { const l = (seen[r.exerciseId] ??= []); if (l.length < 3) l.push(r.weId); }
  const ids = Object.values(seen).flatMap((l) => l.slice(1));
  if (!ids.length) return out;
  const sets = await db.select().from(workoutSet).where(and(inArray(workoutSet.workoutExerciseId, ids), eq(workoutSet.done, true))).orderBy(asc(workoutSet.position));
  for (const [exId, l] of Object.entries(seen)) out[exId] = l.slice(1).map((weId) => sets.filter((x) => x.workoutExerciseId === weId && x.kind !== "warmup").map((x) => ({ weightKg: x.weightKg, reps: x.reps, kind: x.kind })));
  return out;
}

export async function getWorkout(userId: string, id: string) {
  const [w] = await db.select().from(workout).where(and(eq(workout.id, id), eq(workout.userId, userId)));
  if (!w) return null;
  const exs = await db.select().from(workoutExercise).where(eq(workoutExercise.workoutId, id)).orderBy(asc(workoutExercise.position));
  const sets = exs.length ? await db.select().from(workoutSet).where(inArray(workoutSet.workoutExerciseId, exs.map((e) => e.id))).orderBy(asc(workoutSet.position)) : [];
  return { ...w, exercises: exs.map((e) => ({ ...e, sets: sets.filter((s) => s.workoutExerciseId === e.id) })) };
}

export const e1rm = (w: number | null, r: number | null) => (!w || !r ? 0 : w * (1 + Math.min(r, 12) / 30));

/**
 * For each routine: when you last did it, and which of its main muscles are still recovering from a recent session.
 * Recovery is worked out from the sets you actually finished, so it follows what you did and not only what was planned.
 */
export async function routineReadiness(userId: string, routines: { id: string; exercises: { exerciseId: string; sets: number }[] }[]) {
  const now = Date.now();
  const done = await db.select({ id: workout.id, routineId: workout.routineId, startedAt: workout.startedAt, finishedAt: workout.finishedAt })
    .from(workout).where(and(eq(workout.userId, userId), eq(workout.status, "finished"))).orderBy(desc(workout.startedAt)).limit(120);
  const last: Record<string, number> = {};
  for (const w of done) if (w.routineId && last[w.routineId] == null) last[w.routineId] = w.startedAt.getTime();

  const recent = done.filter((w) => now - (w.finishedAt ?? w.startedAt).getTime() < 72 * 3_600_000);
  const lastGroup: Partial<Record<Group, number>> = {};
  if (recent.length) {
    const exs = await db.select().from(workoutExercise).where(inArray(workoutExercise.workoutId, recent.map((w) => w.id)));
    const sets = exs.length ? await db.select({ weId: workoutSet.workoutExerciseId, kind: workoutSet.kind }).from(workoutSet).where(and(inArray(workoutSet.workoutExerciseId, exs.map((e) => e.id)), eq(workoutSet.done, true))) : [];
    for (const w of recent) {
      const items = exs.filter((e) => e.workoutId === w.id).map((e) => ({ exerciseId: e.exerciseId, sets: sets.filter((x) => x.weId === e.id && x.kind !== "warmup").length }));
      const at = (w.finishedAt ?? w.startedAt).getTime();
      for (const g of hardGroups(loadOf(items))) lastGroup[g] = Math.max(lastGroup[g] ?? 0, at);
    }
  }
  const waiting: Record<string, { group: Group; hours: number }[]> = {};
  for (const r of routines) waiting[r.id] = recoveryLeft(lastGroup, loadOf(r.exercises), now);
  return { last, waiting };
}

/** "today", "yesterday", "3 days ago", "2 weeks ago"... */
export function agoText(ms: number | undefined, now = Date.now()) {
  if (ms == null) return "Not done yet";
  const days = Math.floor((now - ms) / 86_400_000);
  if (days <= 0) return "Done today";
  if (days === 1) return "Done yesterday";
  if (days < 14) return `Done ${days} days ago`;
  if (days < 60) return `Done ${Math.round(days / 7)} weeks ago`;
  return `Done ${Math.round(days / 30)} months ago`;
}
