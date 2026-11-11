"use server";

import { getProfile, requireUser } from "@/lib/session";
import { EXERCISE_BY_ID, toLite, type ExerciseLite } from "@/lib/exercises";
import { alternativeFor, buildCtx, generatePlan, inferSessionSize, slotOf, SPLITS, type SplitId } from "@/lib/program";
import { db } from "@/db";
import { workout } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export type ProposalExercise = { exerciseId: string; slot: string | null; sets: number; repsMin: number; repsMax: number; restSeconds: number; lite: ExerciseLite };
export type Proposal = { name: string; exercises: ProposalExercise[] };

type Where = "gym" | "home" | "any";

async function ctxFor(where?: Where) {
  const user = await requireUser();
  const p = await getProfile(user.id);
  return { user, p, ctx: buildCtx(p.location, p.equipment, p.experience, where, p.limits) };
}

/** Minutes of the user's last finished workouts, so the site can learn how long they really train. */
async function recentMinutes(userId: string) {
  const rows = await db.select().from(workout).where(and(eq(workout.userId, userId), eq(workout.status, "finished"))).orderBy(desc(workout.startedAt)).limit(6);
  return rows.filter((w) => w.finishedAt).map((w) => (w.finishedAt!.getTime() - w.startedAt.getTime()) / 60000);
}

export async function assistantContext() {
  const { p } = await ctxFor();
  return { name: p.displayName ?? "", goal: p.goal ?? "muscle", location: (p.location ?? "gym") as "gym" | "home" | "both" };
}

/** Every person gets their own variation of the plan, and every new request (the "different plan" button, or a new chat) another one. */
function mixSeed(userId: string, n: number) {
  let h = 2166136261;
  for (const c of userId) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h ^ Math.imul(Math.floor(n) || 1, 2654435761)) >>> 0) % 2147483647;
}

export async function proposePlan(input: { split: SplitId; rotationId: string; seed: number; where?: Where; minutes?: (number | null)[] }): Promise<Proposal[]> {
  const { user, p, ctx } = await ctxFor(input.where);
  const opt = SPLITS.find((s) => s.id === input.split);
  if (!opt) return [];
  const size = inferSessionSize({ experience: p.experience, goal: p.goal, recentMinutes: await recentMinutes(user.id) });
  const plan = generatePlan({ split: opt.id, rotationId: input.rotationId, size, goal: p.goal ?? "muscle", seed: mixSeed(user.id, input.seed), ctx, minutes: (input.minutes ?? []).slice(0, 14).map((m) => (typeof m === "number" && m >= 20 && m <= 150 ? Math.round(m) : null)) });
  return plan.map((w) => ({ name: w.name, exercises: w.exercises.map((e) => ({ ...e, lite: toLite(e.exerciseId) })) }));
}

/** The user tapped an exercise they don't want: propose another one for the same movement. */
export async function swapProposed(input: { exerciseId: string; slot: string | null; exclude: string[]; where?: Where }): Promise<ProposalExercise | null> {
  const { ctx } = await ctxFor(input.where);
  const slot = input.slot ?? slotOf(input.exerciseId);
  const alt = alternativeFor(input.exerciseId, slot, ctx, input.exclude.slice(0, 200));
  if (!alt || !EXERCISE_BY_ID[alt.id]) return null;
  return { exerciseId: alt.id, slot, sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90, lite: toLite(alt.id) };
}
