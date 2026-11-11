"use server";

import { db } from "@/db";
import { mealPlan } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export type PlanItem = { id: string; day: string; meal: string; recipeId: string; servings: number };

export async function getPlan(from: string, to: string): Promise<PlanItem[]> {
  const user = await requireUser();
  if (!day.safeParse(from).success || !day.safeParse(to).success) return [];
  const rows = await db.select().from(mealPlan).where(and(eq(mealPlan.userId, user.id), gte(mealPlan.day, from), lte(mealPlan.day, to))).orderBy(asc(mealPlan.day), asc(mealPlan.createdAt));
  return rows.map((r) => ({ id: r.id, day: r.day, meal: r.meal, recipeId: r.recipeId, servings: r.servings }));
}

const addSchema = z.object({ day, meal: z.enum(["b", "l", "d", "s"]), recipeId: z.string().regex(/^(mine:)?[a-zA-Z0-9-]+$/).max(80), servings: z.number().int().min(1).max(24) });
export async function addPlanItem(raw: unknown) {
  const user = await requireUser();
  const p = addSchema.safeParse(raw);
  if (!p.success) return { ok: false as const, error: "Couldn't add that." };
  const id = crypto.randomUUID();
  await db.insert(mealPlan).values({ id, userId: user.id, ...p.data });
  return { ok: true as const, item: { id, ...p.data } satisfies PlanItem };
}

export async function setPlanServings(id: string, servings: number) {
  const user = await requireUser();
  const s = z.number().int().min(1).max(24).safeParse(servings);
  if (!s.success) return { ok: false as const };
  await db.update(mealPlan).set({ servings: s.data }).where(and(eq(mealPlan.id, id), eq(mealPlan.userId, user.id)));
  return { ok: true as const };
}

export async function removePlanItem(id: string) {
  const user = await requireUser();
  await db.delete(mealPlan).where(and(eq(mealPlan.id, id), eq(mealPlan.userId, user.id)));
  return { ok: true as const };
}

export async function clearPlan(from: string, to: string) {
  const user = await requireUser();
  if (!day.safeParse(from).success || !day.safeParse(to).success) return { ok: false as const };
  await db.delete(mealPlan).where(and(eq(mealPlan.userId, user.id), gte(mealPlan.day, from), lte(mealPlan.day, to)));
  return { ok: true as const };
}
