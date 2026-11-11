"use server";

import { db } from "@/db";
import { waveState, workout, workoutExercise, workoutSet } from "@/db/schema";
import { EXERCISE_BY_ID, isTimed } from "@/lib/exercises";
import { cycleBump, decodeShare, LIFTS, PROGRAM_BY_ID, roundTo, waveWeights, type LiftKey } from "@/lib/programs";
import { requireUser } from "@/lib/session";
import { lastPerformance } from "@/lib/workouts";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { saveProposal } from "./routines";

const uid = () => crypto.randomUUID();

/** Turn a built-in programme into your own workouts (and set them up as your rotation). */
export async function installProgram(programId: string) {
  await requireUser();
  const p = PROGRAM_BY_ID.get(programId);
  if (!p) return { ok: false as const, error: "Unknown programme." };
  const r = await saveProposal(p.days.map((d) => ({ name: `${p.name} · ${d.name}`, exercises: d.ex.map((e) => ({ exerciseId: e.id, sets: e.sets, repsMin: e.min, repsMax: e.max, restSeconds: e.rest })) })), true, "program");
  return r.ok ? { ok: true as const, count: p.days.length } : r;
}

/** Add workouts from a share code. They are added to your list, not to your rotation. */
export async function importShared(code: string) {
  await requireUser();
  const ws = decodeShare(code);
  if (!ws) return { ok: false as const, error: "That code doesn't look right. Copy the whole thing, starting with CH1." };
  const r = await saveProposal(ws.filter((w) => w.exercises.length), false, "shared");
  return r.ok ? { ok: true as const, count: ws.length } : { ok: false as const, error: "Nothing to add." };
}

export type Wave = { squat: number | null; bench: number | null; deadlift: number | null; press: number | null; week: number; cycle: number };
export async function getWave(): Promise<Wave | null> {
  const user = await requireUser();
  const [w] = await db.select().from(waveState).where(eq(waveState.userId, user.id));
  return w ? { squat: w.squat, bench: w.bench, deadlift: w.deadlift, press: w.press, week: w.week, cycle: w.cycle } : null;
}

const tm = z.number().min(10).max(600).nullable();
export async function saveWave(raw: unknown) {
  const user = await requireUser();
  const p = z.object({ squat: tm, bench: tm, deadlift: tm, press: tm }).safeParse(raw);
  if (!p.success) return { ok: false as const, error: "Check the numbers." };
  const have = await db.select().from(waveState).where(eq(waveState.userId, user.id));
  if (have.length) await db.update(waveState).set({ ...p.data, updatedAt: new Date() }).where(eq(waveState.userId, user.id));
  else await db.insert(waveState).values({ userId: user.id, ...p.data });
  revalidatePath("/programs");
  return { ok: true as const };
}

export async function setWaveWeek(week: number) {
  const user = await requireUser();
  const w = z.number().int().min(1).max(4).safeParse(week);
  if (!w.success) return { ok: false as const };
  await db.update(waveState).set({ week: w.data, updatedAt: new Date() }).where(eq(waveState.userId, user.id));
  return { ok: true as const };
}

/** After week 4: add the usual amount to every training max and start again at week 1. */
export async function finishWaveCycle() {
  const user = await requireUser();
  const [w] = await db.select().from(waveState).where(eq(waveState.userId, user.id));
  if (!w) return { ok: false as const };
  const up = (k: LiftKey) => (w[k] != null ? roundTo(w[k]! + cycleBump(k)) : null);
  await db.update(waveState).set({ squat: up("squat"), bench: up("bench"), deadlift: up("deadlift"), press: up("press"), week: 1, cycle: w.cycle + 1, updatedAt: new Date() }).where(eq(waveState.userId, user.id));
  revalidatePath("/programs");
  return { ok: true as const };
}

/** Start today's 5/3/1 workout for one lift: the three main sets already loaded, then the extra work. */
export async function startWaveSession(lift: LiftKey) {
  const user = await requireUser();
  const [active] = await db.select().from(workout).where(and(eq(workout.userId, user.id), eq(workout.status, "active")));
  if (active) redirect(`/workout/${active.id}`);
  const [w] = await db.select().from(waveState).where(eq(waveState.userId, user.id));
  const L = LIFTS.find((l) => l.key === lift);
  const base = w?.[lift];
  if (!w || !L || base == null) redirect("/programs");
  const day = PROGRAM_BY_ID.get("five-three-one")!.days.find((d) => d.ex[0].id === L.id)!;
  const id = uid();
  await db.insert(workout).values({ id, userId: user.id, name: `5/3/1 · ${L.label} · Week ${w.week}`, startedAt: new Date() });
  const last = await lastPerformance(user.id, day.ex.map((e) => e.id));
  for (const [pos, e] of day.ex.entries()) {
    const weId = uid();
    const main = pos === 0;
    await db.insert(workoutExercise).values({ id: weId, workoutId: id, exerciseId: e.id, position: pos, restSeconds: e.rest, repsMin: main ? 1 : e.min, repsMax: main ? 5 : e.max, note: main ? "Last set: as many good reps as you can (not in the deload week)." : null });
    if (main) {
      await db.insert(workoutSet).values(waveWeights(base, w.week).map((s, i) => ({ id: uid(), workoutExerciseId: weId, position: i, kind: "normal", weightKg: s.kg, reps: s.reps, done: false })));
    } else {
      const prev = last[e.id] ?? [];
      await db.insert(workoutSet).values(Array.from({ length: e.sets }, (_, i) => { const ref = prev.length ? prev[Math.min(i, prev.length - 1)] : null; return { id: uid(), workoutExerciseId: weId, position: i, kind: "normal", weightKg: isTimed(EXERCISE_BY_ID[e.id]) ? null : ref?.weightKg ?? null, reps: ref?.reps ?? null, done: false }; }));
    }
  }
  redirect(`/workout/${id}`);
}

