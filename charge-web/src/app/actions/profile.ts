"use server";

import { db } from "@/db";
import { bodyWeight, profile } from "@/db/schema";
import { fromDisplay } from "@/lib/units";
import { levelFor, sinceFor, TRAINING_IDS } from "@/lib/level";
import { requireUser } from "@/lib/session";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cleanLimits } from "@/lib/limits";

export async function dismissTour() {
  const user = await requireUser();
  await db.update(profile).set({ tourDismissed: true }).where(eq(profile.userId, user.id));
  revalidatePath("/dashboard");
}

export async function updateSettings(data: { units?: "kg" | "lb"; heightUnit?: "cm" | "ft"; restSeconds?: number }) {
  const user = await requireUser();
  const p = z.object({ units: z.enum(["kg", "lb"]).optional(), heightUnit: z.enum(["cm", "ft"]).optional(), restSeconds: z.number().int().min(10).max(900).optional() }).safeParse(data);
  if (!p.success) return { ok: false as const };
  await db.update(profile).set({ ...p.data, updatedAt: new Date() }).where(eq(profile.userId, user.id));
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function updateFeedbackSettings(data: { soundEnabled?: boolean; vibrationEnabled?: boolean; soundVolume?: number; keepAwake?: boolean }) {
  const user = await requireUser();
  const p = z.object({ soundEnabled: z.boolean().optional(), vibrationEnabled: z.boolean().optional(), soundVolume: z.number().int().min(0).max(100).optional(), keepAwake: z.boolean().optional() }).safeParse(data);
  if (!p.success) return { ok: false as const };
  await db.update(profile).set({ ...p.data, updatedAt: new Date() }).where(eq(profile.userId, user.id));
  revalidatePath("/settings"); revalidatePath("/workout", "layout");
  return { ok: true as const };
}

/** Change the username on its own (it lives with the account settings). */
export async function updateUsername(name: string) {
  const user = await requireUser();
  const n = z.string().trim().regex(/^[a-zA-Z0-9_.]{3,20}$/).safeParse(name);
  if (!n.success) return { ok: false as const, error: "Use 3 to 20 letters, numbers, _ or ." };
  const taken = await db.select({ id: profile.userId }).from(profile).where(and(sql`lower(${profile.displayName}) = ${n.data.toLowerCase()}`, ne(profile.userId, user.id))).limit(1);
  if (taken.length) return { ok: false as const, error: "That username is taken. Try another one." };
  await db.update(profile).set({ displayName: n.data, updatedAt: new Date() }).where(eq(profile.userId, user.id));
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function updateProfileDetails(data: Record<string, unknown>) {
  const user = await requireUser();
  const thisYear = new Date().getFullYear();
  const p = z.object({
    gender: z.enum(["male", "female", "other"]),
    birthYear: z.number().int().min(thisYear - 90).max(thisYear - 14),
    heightCm: z.number().min(120).max(230),
    goalWeightKg: z.number().min(25).max(400).nullable(),
    goal: z.enum(["muscle", "lose", "recomp", "strength", "maintain", "endurance"]),
    trainingTime: z.enum(TRAINING_IDS),
    location: z.enum(["gym", "home", "both"]),
    equipment: z.array(z.string()).max(12),
    activity: z.number().min(1.2).max(1.9),
    diet: z.enum(["omni", "veg", "vegan"]),
    injuries: z.string().trim().max(500).nullable(),
    limits: z.record(z.string(), z.enum(["careful", "avoid"])),
  }).safeParse(data);
  if (!p.success) return { ok: false as const, error: "Please check the values (height 120 to 230 cm, birth year, goal weight)." };
  const [cur] = await db.select().from(profile).where(eq(profile.userId, user.id));
  // same answer as before keeps the running clock; a different one starts it again
  const since = cur?.trainingTime === p.data.trainingTime && cur.trainingSince != null ? cur.trainingSince : sinceFor(p.data.trainingTime);
  await db.update(profile).set({ ...p.data, limits: cleanLimits(p.data.limits), trainingSince: since, experience: levelFor(since), equipment: p.data.location === "gym" ? [] : p.data.equipment, updatedAt: new Date() }).where(eq(profile.userId, user.id));
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Home shows "you levelled up" once; this clears it. */
export async function dismissLevelNotice() {
  const user = await requireUser();
  await db.update(profile).set({ levelNotice: null }).where(eq(profile.userId, user.id));
  revalidatePath("/dashboard");
}

export async function logBodyWeight(weightDisplay: number, units: "kg" | "lb") {
  const user = await requireUser();
  const w = z.number().min(25).max(700).safeParse(weightDisplay);
  if (!w.success) return { ok: false as const, error: "Enter a valid weight." };
  const kg = fromDisplay(w.data, units)!;
  const day = new Date().toISOString().slice(0, 10);
  const rows = await db.select().from(bodyWeight).where(and(eq(bodyWeight.userId, user.id), eq(bodyWeight.day, day)));
  if (rows.length) await db.update(bodyWeight).set({ weightKg: kg }).where(eq(bodyWeight.id, rows[0].id));
  else await db.insert(bodyWeight).values({ id: crypto.randomUUID(), userId: user.id, day, weightKg: kg });
  await db.update(profile).set({ weightKg: kg, updatedAt: new Date() }).where(eq(profile.userId, user.id));
  revalidatePath("/dashboard"); revalidatePath("/settings");
  return { ok: true as const };
}
