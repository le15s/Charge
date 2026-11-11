"use server";

import { db } from "@/db";
import { bodyMeasure, bodyWeight, profile, progressPhoto } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { fromDisplay } from "@/lib/units";
import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MEASURES, type MeasureKey } from "@/lib/body";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !isNaN(Date.parse(d)) && Date.parse(d) <= Date.now() + 36 * 3600 * 1000, "date");
const unitsOf = (u: string | null) => (u === "lb" ? "lb" : "kg") as "kg" | "lb";
/** Lengths follow the weight unit: kg users see cm, lb users see inches. Stored as cm. */
const toCm = (v: number, u: "kg" | "lb") => Math.round((u === "lb" ? v * 2.54 : v) * 10) / 10;

export async function getBodyData() {
  const user = await requireUser();
  const [p] = await db.select().from(profile).where(eq(profile.userId, user.id));
  const [weights, measures, photos] = await Promise.all([
    db.select().from(bodyWeight).where(eq(bodyWeight.userId, user.id)).orderBy(asc(bodyWeight.day)),
    db.select().from(bodyMeasure).where(eq(bodyMeasure.userId, user.id)).orderBy(asc(bodyMeasure.day)),
    db.select({ id: progressPhoto.id, day: progressPhoto.day, pose: progressPhoto.pose, note: progressPhoto.note }).from(progressPhoto).where(eq(progressPhoto.userId, user.id)).orderBy(desc(progressPhoto.day), desc(progressPhoto.createdAt)),
  ]);
  return { units: unitsOf(p?.units ?? null), goalKg: p?.goalWeightKg ?? null, weights: weights.map((w) => ({ id: w.id, day: w.day, kg: w.weightKg })), measures, photos };
}
export type BodyData = Awaited<ReturnType<typeof getBodyData>>;

export async function saveWeight(dayStr: string, display: number, units: "kg" | "lb") {
  const user = await requireUser();
  const d = day.safeParse(dayStr); const w = z.number().min(25).max(700).safeParse(display);
  if (!d.success) return { ok: false as const, error: "Pick a valid date." };
  if (!w.success) return { ok: false as const, error: "Enter a weight between 25 and 700." };
  const kg = fromDisplay(w.data, units)!;
  const rows = await db.select().from(bodyWeight).where(and(eq(bodyWeight.userId, user.id), eq(bodyWeight.day, d.data)));
  if (rows.length) await db.update(bodyWeight).set({ weightKg: kg }).where(eq(bodyWeight.id, rows[0].id));
  else await db.insert(bodyWeight).values({ id: crypto.randomUUID(), userId: user.id, day: d.data, weightKg: kg });
  // keep the profile's current weight in step with the newest entry
  const [latest] = await db.select().from(bodyWeight).where(eq(bodyWeight.userId, user.id)).orderBy(desc(bodyWeight.day)).limit(1);
  if (latest) await db.update(profile).set({ weightKg: latest.weightKg, updatedAt: new Date() }).where(eq(profile.userId, user.id));
  revalidatePath("/body"); revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function deleteWeight(id: string) {
  const user = await requireUser();
  await db.delete(bodyWeight).where(and(eq(bodyWeight.id, id), eq(bodyWeight.userId, user.id)));
  revalidatePath("/body");
  return { ok: true as const };
}

export async function saveMeasures(dayStr: string, values: Partial<Record<MeasureKey, number | null>>, units: "kg" | "lb") {
  const user = await requireUser();
  const d = day.safeParse(dayStr);
  if (!d.success) return { ok: false as const, error: "Pick a valid date." };
  const row: Partial<Record<MeasureKey, number | null>> = {};
  for (const k of MEASURES) {
    const v = values[k];
    if (v == null) { row[k] = null; continue; }
    if (!Number.isFinite(v) || v <= 0) return { ok: false as const, error: "Measurements must be positive numbers." };
    if (k === "bodyFat") { if (v > 70) return { ok: false as const, error: "Body fat looks too high." }; row[k] = Math.round(v * 10) / 10; }
    else { const cm = toCm(v, units); if (cm < 5 || cm > 250) return { ok: false as const, error: `Check the ${k} number.` }; row[k] = cm; }
  }
  if (MEASURES.every((k) => row[k] == null)) return { ok: false as const, error: "Fill in at least one measurement." };
  const rows = await db.select().from(bodyMeasure).where(and(eq(bodyMeasure.userId, user.id), eq(bodyMeasure.day, d.data)));
  if (rows.length) await db.update(bodyMeasure).set(row).where(eq(bodyMeasure.id, rows[0].id));
  else await db.insert(bodyMeasure).values({ id: crypto.randomUUID(), userId: user.id, day: d.data, ...row });
  revalidatePath("/body");
  return { ok: true as const };
}

export async function deleteMeasures(id: string) {
  const user = await requireUser();
  await db.delete(bodyMeasure).where(and(eq(bodyMeasure.id, id), eq(bodyMeasure.userId, user.id)));
  revalidatePath("/body");
  return { ok: true as const };
}

const jpeg = (max: number) => z.string().startsWith("data:image/jpeg;base64,").max(max);
const photoSchema = z.object({ day, pose: z.enum(["front", "side", "back", "other"]), note: z.string().trim().max(120).optional(), thumb: jpeg(120_000), full: jpeg(900_000) });
export async function addPhoto(raw: unknown) {
  const user = await requireUser();
  const p = photoSchema.safeParse(raw);
  if (!p.success) return { ok: false as const, error: "That photo couldn't be saved. Try a smaller one." };
  const id = crypto.randomUUID();
  await db.insert(progressPhoto).values({ id, userId: user.id, day: p.data.day, pose: p.data.pose, note: p.data.note || null, thumb: p.data.thumb, full: p.data.full });
  revalidatePath("/body");
  return { ok: true as const, id };
}

export async function deletePhoto(id: string) {
  const user = await requireUser();
  await db.delete(progressPhoto).where(and(eq(progressPhoto.id, id), eq(progressPhoto.userId, user.id)));
  revalidatePath("/body");
  return { ok: true as const };
}
