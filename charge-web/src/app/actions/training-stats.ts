"use server";

import { db } from "@/db";
import { profile, workout, workoutExercise, workoutSet } from "@/db/schema";
import { EXERCISE_BY_ID, isTimed } from "@/lib/exercises";
import { requireUser } from "@/lib/session";
import { e1rm } from "@/lib/units";
import { and, eq } from "drizzle-orm";

const DAY = 86_400_000;

export type MuscleVolume = Record<string, { d7: number; d30: number }>;
export type LiftHistory = { id: string; name: string; sessions: number; points: { at: number; kg: number }[] };

/** What the Muscles and Strength tabs on the Body page need: sets per muscle (last 7 and 30 days) and best estimated 1RM per exercise per workout. */
export async function getTrainingStats() {
  const user = await requireUser();
  const [p] = await db.select({ w: profile.weightKg }).from(profile).where(eq(profile.userId, user.id));
  const done = await db
    .select({ at: workout.startedAt, ex: workoutExercise.exerciseId, wid: workout.id, kg: workoutSet.weightKg, reps: workoutSet.reps, kind: workoutSet.kind })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutSet.workoutExerciseId, workoutExercise.id))
    .innerJoin(workout, eq(workoutExercise.workoutId, workout.id))
    .where(and(eq(workout.userId, user.id), eq(workout.status, "finished"), eq(workoutSet.done, true)));

  const now = Date.now();
  const muscles: MuscleVolume = {};
  const best = new Map<string, { id: string; at: number; kg: number }>(); // exercise + workout -> best e1RM
  let sets7 = 0, sets30 = 0;
  for (const s of done) {
    if (s.kind === "warmup") continue;
    const ex = EXERCISE_BY_ID[s.ex];
    const at = s.at instanceof Date ? s.at.getTime() : Number(s.at);
    const age = now - at;
    if (ex && age <= 30 * DAY) {
      sets30++; if (age <= 7 * DAY) sets7++;
      // a main muscle gets a full set, a helper muscle half
      const add = (m: string, v: number) => { const c = (muscles[m] ??= { d7: 0, d30: 0 }); c.d30 += v; if (age <= 7 * DAY) c.d7 += v; };
      ex.primaryMuscles.forEach((m) => add(m, 1));
      ex.secondaryMuscles.forEach((m) => add(m, 0.5));
    }
    if (ex && !isTimed(ex) && s.kg && s.kg > 0 && s.reps && s.reps > 0) {
      const v = e1rm(s.kg, s.reps);
      const k = `${s.ex}|${s.wid}`;
      const cur = best.get(k);
      if (!cur || v > cur.kg) best.set(k, { id: s.ex, at, kg: Math.round(v * 10) / 10 });
    }
  }
  for (const m of Object.values(muscles)) { m.d7 = Math.round(m.d7 * 10) / 10; m.d30 = Math.round(m.d30 * 10) / 10; }

  const by = new Map<string, { at: number; kg: number }[]>();
  for (const b of best.values()) by.set(b.id, [...(by.get(b.id) ?? []), { at: b.at, kg: b.kg }]);
  const lifts: LiftHistory[] = [...by.entries()].map(([id, pts]) => ({
    id, name: EXERCISE_BY_ID[id]?.name ?? id, sessions: pts.length, points: pts.sort((a, b) => a.at - b.at),
  })).sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));

  return { muscles, sets7, sets30, lifts, profileKg: p?.w ?? null };
}
export type TrainingStats = Awaited<ReturnType<typeof getTrainingStats>>;
