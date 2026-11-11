"use server";

import { db } from "@/db";
import { profile, workout, workoutExercise, workoutSet } from "@/db/schema";
import { EXERCISE_BY_ID, isTimed, toLite } from "@/lib/exercises";
import { getRoutine, lastPerformance } from "@/lib/workouts";
import { ownsWorkout, workoutIdOfExercise, workoutIdOfSet } from "@/lib/ownership";
import { requireUser } from "@/lib/session";
import { and, asc, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const uid = () => crypto.randomUUID();

/** Start a workout from a routine (or an empty one) and open the tracker. */
export async function startWorkout(routineId: string | null) {
  const user = await requireUser();
  const [existing] = await db.select().from(workout).where(and(eq(workout.userId, user.id), eq(workout.status, "active")));
  if (existing) redirect(`/workout/${existing.id}`);

  const r = routineId ? await getRoutine(user.id, routineId) : null;
  const id = uid();
  await db.insert(workout).values({ id, userId: user.id, routineId: r?.id ?? null, name: r?.name ?? "Quick workout", startedAt: new Date() });
  if (r?.exercises.length) {
    const last = await lastPerformance(user.id, r.exercises.map((e) => e.exerciseId));
    for (const e of r.exercises) {
      const weId = uid();
      await db.insert(workoutExercise).values({ id: weId, workoutId: id, exerciseId: e.exerciseId, position: e.position, restSeconds: e.restSeconds, repsMin: e.repsMin, repsMax: e.repsMax });
      const prev = last[e.exerciseId] ?? [];
      const bump = prev.length >= Math.min(e.sets, 2) && !isTimed(EXERCISE_BY_ID[e.exerciseId]) && prev.every((s) => (s.reps ?? 0) >= e.repsMax && (s.weightKg ?? 0) > 0) ? 2.5 : 0;
      const rows = Array.from({ length: e.sets }, (_, i) => {
        const ref = prev.length ? prev[Math.min(i, prev.length - 1)] : null;
        return { id: uid(), workoutExerciseId: weId, position: i, kind: "normal", weightKg: ref?.weightKg != null ? ref.weightKg + (ref.weightKg ? bump : 0) : null, reps: ref ? (bump ? e.repsMin : ref.reps) : null, done: false };
      });
      await db.insert(workoutSet).values(rows);
    }
  }
  redirect(`/workout/${id}`);
}

export async function renameWorkout(id: string, name: string) {
  const user = await requireUser();
  const n = z.string().trim().min(1).max(80).safeParse(name);
  if (!n.success || !(await ownsWorkout(user.id, id))) return;
  await db.update(workout).set({ name: n.data }).where(eq(workout.id, id));
}

export async function addWorkoutExercise(workoutId: string, exerciseId: string) {
  const user = await requireUser();
  if (!(await ownsWorkout(user.id, workoutId)) || !EXERCISE_BY_ID[exerciseId]) return null;
  const [m] = await db.select({ v: max(workoutExercise.position) }).from(workoutExercise).where(eq(workoutExercise.workoutId, workoutId));
  const timed = isTimed(EXERCISE_BY_ID[exerciseId]);
  const weId = uid();
  await db.insert(workoutExercise).values({ id: weId, workoutId, exerciseId, position: (m?.v ?? -1) + 1, repsMin: timed ? 30 : 8, repsMax: timed ? 60 : 12 });
  const last = (await lastPerformance(user.id, [exerciseId]))[exerciseId] ?? [];
  const sets = Array.from({ length: 3 }, (_, i) => { const ref = last.length ? last[Math.min(i, last.length - 1)] : null; return { id: uid(), workoutExerciseId: weId, position: i, kind: "normal", weightKg: ref?.weightKg ?? null, reps: ref?.reps ?? null, done: false, completedAt: null }; });
  await db.insert(workoutSet).values(sets);
  return { id: weId, exerciseId, lite: toLite(exerciseId), restSeconds: null as number | null, repsMin: timed ? 30 : 8, repsMax: timed ? 60 : 12, note: null as string | null, sets, prev: last };
}

export async function replaceWorkoutExercise(weId: string, exerciseId: string) {
  const user = await requireUser();
  if (!(await workoutIdOfExercise(user.id, weId)) || !EXERCISE_BY_ID[exerciseId]) return null;
  await db.update(workoutExercise).set({ exerciseId }).where(eq(workoutExercise.id, weId));
  await db.update(workoutSet).set({ done: false, completedAt: null }).where(eq(workoutSet.workoutExerciseId, weId));
  const last = (await lastPerformance(user.id, [exerciseId]))[exerciseId] ?? [];
  return { lite: toLite(exerciseId), prev: last };
}

export async function removeWorkoutExercise(weId: string) {
  const user = await requireUser();
  if (!(await workoutIdOfExercise(user.id, weId))) return;
  await db.delete(workoutExercise).where(eq(workoutExercise.id, weId));
}

export async function updateWorkoutExercise(weId: string, data: { restSeconds?: number | null; note?: string | null }) {
  const user = await requireUser();
  if (!(await workoutIdOfExercise(user.id, weId))) return;
  const p = z.object({ restSeconds: z.number().int().min(10).max(900).nullable().optional(), note: z.string().max(500).nullable().optional() }).safeParse(data);
  if (p.success) await db.update(workoutExercise).set(p.data).where(eq(workoutExercise.id, weId));
}

export async function addWorkoutSet(weId: string) {
  const user = await requireUser();
  if (!(await workoutIdOfExercise(user.id, weId))) return null;
  const sets = await db.select().from(workoutSet).where(eq(workoutSet.workoutExerciseId, weId)).orderBy(asc(workoutSet.position));
  const last = sets[sets.length - 1];
  const row = { id: uid(), workoutExerciseId: weId, position: sets.length, kind: "normal", weightKg: last?.weightKg ?? null, reps: last?.reps ?? null, done: false, completedAt: null as Date | null };
  await db.insert(workoutSet).values(row);
  return row;
}

export async function removeWorkoutSet(setId: string) {
  const user = await requireUser();
  if (!(await workoutIdOfSet(user.id, setId))) return;
  await db.delete(workoutSet).where(eq(workoutSet.id, setId));
}

export async function updateWorkoutSet(setId: string, data: { weightKg?: number | null; reps?: number | null; kind?: string; done?: boolean }) {
  const user = await requireUser();
  if (!(await workoutIdOfSet(user.id, setId))) return;
  const p = z.object({ weightKg: z.number().min(-500).max(2000).nullable().optional(), reps: z.number().int().min(0).max(1000).nullable().optional(), kind: z.enum(["normal", "warmup", "drop", "failure"]).optional(), done: z.boolean().optional() }).safeParse(data);
  if (!p.success) return;
  await db.update(workoutSet).set({ ...p.data, ...(p.data.done !== undefined ? { completedAt: p.data.done ? new Date() : null } : {}) }).where(eq(workoutSet.id, setId));
}

export async function finishWorkout(id: string) {
  const user = await requireUser();
  if (!(await ownsWorkout(user.id, id))) return { ok: false as const, error: "Workout not found." };
  const exs = await db.select().from(workoutExercise).where(eq(workoutExercise.workoutId, id));
  let done = 0;
  for (const e of exs) {
    const sets = await db.select().from(workoutSet).where(eq(workoutSet.workoutExerciseId, e.id));
    const keep = sets.filter((s) => s.done);
    done += keep.length;
  }
  if (!done) return { ok: false as const, error: "Tick at least one set as done before finishing." };
  for (const e of exs) {
    await db.delete(workoutSet).where(and(eq(workoutSet.workoutExerciseId, e.id), eq(workoutSet.done, false)));
    const left = await db.select().from(workoutSet).where(eq(workoutSet.workoutExerciseId, e.id));
    if (!left.length) await db.delete(workoutExercise).where(eq(workoutExercise.id, e.id));
  }
  const [w] = await db.select().from(workout).where(eq(workout.id, id));
  await db.update(workout).set({ status: "finished", finishedAt: new Date() }).where(eq(workout.id, id));
  // Move the rolling rotation forward: the next workout is whatever follows the one just finished.
  const [p] = await db.select().from(profile).where(eq(profile.userId, user.id));
  const rot = p?.rotation ?? [];
  if (w?.routineId && rot.length) {
    const at = rot.indexOf(w.routineId);
    if (at >= 0) await db.update(profile).set({ rotationPos: (at + 1) % rot.length }).where(eq(profile.userId, user.id));
  }
  revalidatePath("/dashboard"); revalidatePath("/history");
  return { ok: true as const };
}

export async function discardWorkout(id: string) {
  const user = await requireUser();
  if (!(await ownsWorkout(user.id, id))) return;
  await db.delete(workout).where(eq(workout.id, id));
  revalidatePath("/dashboard");
}

export async function deleteWorkoutHistory(id: string) {
  const user = await requireUser();
  if (!(await ownsWorkout(user.id, id))) return;
  await db.delete(workout).where(eq(workout.id, id));
  revalidatePath("/history"); revalidatePath("/dashboard");
}

export async function setRestDefault(seconds: number) {
  const user = await requireUser();
  const s = z.number().int().min(10).max(900).safeParse(seconds);
  if (!s.success) return;
  await db.update(profile).set({ restSeconds: s.data }).where(eq(profile.userId, user.id));
}
