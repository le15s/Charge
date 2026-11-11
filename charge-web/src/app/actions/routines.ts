"use server";

import { db } from "@/db";
import { profile, routine, routineExercise } from "@/db/schema";
import { EXERCISE_BY_ID, isTimed, toLite } from "@/lib/exercises";
import { ownsRoutine, routineIdOfExercise } from "@/lib/ownership";
import { PLATE_COUNT, freeColor, plateColors } from "@/lib/plates";
import { requireUser } from "@/lib/session";
import { and, asc, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const uid = () => crypto.randomUUID();

export async function createRoutine(name: string) {
  const user = await requireUser();
  const n = z.string().trim().min(1).max(80).safeParse(name);
  if (!n.success) return { ok: false as const, error: "Give your workout a name." };
  const [m] = await db.select({ v: max(routine.position) }).from(routine).where(eq(routine.userId, user.id));
  const id = uid();
  await db.insert(routine).values({ id, userId: user.id, name: n.data, position: (m?.v ?? -1) + 1, plateColor: await nextPlateColor(user.id) });
  revalidatePath("/workouts");
  return { ok: true as const, id };
}

/** A new workout gets the first plate colour that none of your other workouts use. */
async function nextPlateColor(userId: string) {
  const mine = await db.select().from(routine).where(eq(routine.userId, userId));
  return freeColor([...plateColors(mine).values()]);
}

export async function setRoutineColor(id: string, color: number) {
  const user = await requireUser();
  if (!Number.isInteger(color) || color < 0 || color >= PLATE_COUNT || !(await ownsRoutine(user.id, id))) return;
  await db.update(routine).set({ plateColor: color }).where(eq(routine.id, id));
  revalidatePath("/workouts"); revalidatePath("/dashboard");
}

export async function renameRoutine(id: string, name: string) {
  const user = await requireUser();
  const n = z.string().trim().min(1).max(80).safeParse(name);
  if (!n.success || !(await ownsRoutine(user.id, id))) return;
  await db.update(routine).set({ name: n.data }).where(eq(routine.id, id));
  revalidatePath("/workouts");
}

export async function deleteRoutine(id: string) {
  const user = await requireUser();
  if (!(await ownsRoutine(user.id, id))) return;
  await db.delete(routine).where(eq(routine.id, id));
  revalidatePath("/workouts");
}

export async function addRoutineExercise(routineId: string, exerciseId: string) {
  const user = await requireUser();
  if (!(await ownsRoutine(user.id, routineId)) || !EXERCISE_BY_ID[exerciseId]) return null;
  const [m] = await db.select({ v: max(routineExercise.position) }).from(routineExercise).where(eq(routineExercise.routineId, routineId));
  const timed = isTimed(EXERCISE_BY_ID[exerciseId]);
  const row = { id: uid(), routineId, exerciseId, position: (m?.v ?? -1) + 1, sets: 3, repsMin: timed ? 30 : 8, repsMax: timed ? 60 : 12, restSeconds: null as number | null };
  await db.insert(routineExercise).values(row);
  revalidatePath(`/workouts/${routineId}`);
  return { ...row, lite: toLite(exerciseId) };
}

export async function removeRoutineExercise(reId: string) {
  const user = await requireUser();
  const rid = await routineIdOfExercise(user.id, reId);
  if (!rid) return;
  await db.delete(routineExercise).where(eq(routineExercise.id, reId));
  const rest = await db.select().from(routineExercise).where(eq(routineExercise.routineId, rid)).orderBy(asc(routineExercise.position));
  for (let i = 0; i < rest.length; i++) await db.update(routineExercise).set({ position: i }).where(eq(routineExercise.id, rest[i].id));
  revalidatePath(`/workouts/${rid}`);
}

export async function updateRoutineExercise(reId: string, data: { sets?: number; repsMin?: number; repsMax?: number; restSeconds?: number | null }) {
  const user = await requireUser();
  const rid = await routineIdOfExercise(user.id, reId);
  if (!rid) return;
  const p = z.object({ sets: z.number().int().min(1).max(15).optional(), repsMin: z.number().int().min(1).max(200).optional(), repsMax: z.number().int().min(1).max(200).optional(), restSeconds: z.number().int().min(10).max(900).nullable().optional() }).safeParse(data);
  if (!p.success) return;
  await db.update(routineExercise).set(p.data).where(eq(routineExercise.id, reId));
}

export async function moveRoutineExercise(reId: string, dir: -1 | 1) {
  const user = await requireUser();
  const rid = await routineIdOfExercise(user.id, reId);
  if (!rid) return;
  const rows = await db.select().from(routineExercise).where(eq(routineExercise.routineId, rid)).orderBy(asc(routineExercise.position));
  const i = rows.findIndex((r) => r.id === reId), j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  await db.update(routineExercise).set({ position: j }).where(eq(routineExercise.id, rows[i].id));
  await db.update(routineExercise).set({ position: i }).where(eq(routineExercise.id, rows[j].id));
  revalidatePath(`/workouts/${rid}`);
}

export async function replaceRoutineExercise(reId: string, exerciseId: string) {
  const user = await requireUser();
  const rid = await routineIdOfExercise(user.id, reId);
  if (!rid || !EXERCISE_BY_ID[exerciseId]) return;
  await db.update(routineExercise).set({ exerciseId }).where(eq(routineExercise.id, reId));
  revalidatePath(`/workouts/${rid}`);
}

export type SavedProposal = { name: string; exercises: { exerciseId: string; sets: number; repsMin: number; repsMax: number; restSeconds: number }[] };
export async function saveProposal(workouts: SavedProposal[], asRotation = true, source: "assistant" | "program" | "shared" = "assistant") {
  const user = await requireUser();
  const parsed = z.array(z.object({ name: z.string().trim().min(1).max(80), exercises: z.array(z.object({ exerciseId: z.string(), sets: z.number().int().min(1).max(15), repsMin: z.number().int().min(1).max(200), repsMax: z.number().int().min(1).max(200), restSeconds: z.number().int().min(10).max(900) })).min(1).max(20) })).min(1).max(8).safeParse(workouts);
  if (!parsed.success) return { ok: false as const, error: "Nothing to save." };
  const [m] = await db.select({ v: max(routine.position) }).from(routine).where(eq(routine.userId, user.id));
  let pos = (m?.v ?? -1) + 1;
  const ids: string[] = [];
  const taken = [...plateColors(await db.select().from(routine).where(eq(routine.userId, user.id))).values()];
  for (const w of parsed.data) {
    const id = uid(); ids.push(id);
    const color = freeColor(taken); taken.push(color);
    await db.insert(routine).values({ id, userId: user.id, name: w.name, source, position: pos++, plateColor: color });
    const rows = w.exercises.filter((e) => EXERCISE_BY_ID[e.exerciseId]).map((e, i) => ({ id: uid(), routineId: id, exerciseId: e.exerciseId, position: i, sets: e.sets, repsMin: e.repsMin, repsMax: Math.max(e.repsMax, e.repsMin), restSeconds: e.restSeconds }));
    if (rows.length) await db.insert(routineExercise).values(rows);
  }
  if (asRotation) await db.update(profile).set({ rotation: ids, rotationPos: 0, updatedAt: new Date() }).where(eq(profile.userId, user.id));
  revalidatePath("/workouts"); revalidatePath("/dashboard");
  return { ok: true as const, ids };
}

export async function searchForPicker(q: string, muscle: string, equipment: string, offset: number) {
  await requireUser();
  const { searchExercises } = await import("@/lib/exercises");
  const r = searchExercises({ q, muscle: muscle || undefined, equipment: equipment || undefined, category: "strength" }, 30, offset);
  return { total: r.total, items: r.items.map((e) => toLite(e.id)) };
}
