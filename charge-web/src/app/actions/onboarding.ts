"use server";

import { db } from "@/db";
import { bodyWeight, profile } from "@/db/schema";
import { fromDisplay } from "@/lib/units";
import { requireUser } from "@/lib/session";
import { and, eq, ne, sql } from "drizzle-orm";
import { USERNAME_RE } from "@/lib/onboarding";
import { cleanLimits } from "@/lib/limits";
import { levelFor, sinceFor, TRAINING_IDS } from "@/lib/level";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const thisYear = new Date().getFullYear();

const schemas = {
  about: z.object({ displayName: z.string().trim().regex(USERNAME_RE), gender: z.enum(["male", "female", "other"]), birthYear: z.number().int().min(thisYear - 90).max(thisYear - 14) }),
  body: z.object({ units: z.enum(["kg", "lb"]), heightUnit: z.enum(["cm", "ft"]).default("cm"), heightCm: z.number().min(120).max(230), weight: z.number().min(25).max(700), goalWeight: z.number().min(25).max(700).nullable() }),
  goal: z.object({ goal: z.enum(["muscle", "lose", "recomp", "strength", "maintain", "endurance"]) }),
  experience: z.object({ trainingTime: z.enum(TRAINING_IDS) }),
  limits: z.object({ limits: z.record(z.string(), z.enum(["careful", "avoid"])), injuries: z.string().trim().max(500).nullable() }),
  where: z.object({ location: z.enum(["gym", "home", "both"]), equipment: z.array(z.string()).max(12) }),
  lifestyle: z.object({ activity: z.number().min(1.2).max(1.9), diet: z.enum(["omni", "veg", "vegan"]) }),
} as const;

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveOnboardingStep(step: keyof typeof schemas, raw: unknown): Promise<SaveResult> {
  const user = await requireUser();
  const parsed = schemas[step].safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields." };
  const d = parsed.data as Record<string, any>;
  if (step === "about") {
    const taken = await db.select({ id: profile.userId }).from(profile).where(and(sql`lower(${profile.displayName}) = ${d.displayName.toLowerCase()}`, ne(profile.userId, user.id))).limit(1);
    if (taken.length) return { ok: false, error: "That username is taken. Try another one." };
  }
  let values: Partial<typeof profile.$inferInsert> = {};
  if (step === "body") {
    values = { units: d.units, heightUnit: d.heightUnit, heightCm: d.heightCm, weightKg: fromDisplay(d.weight, d.units), goalWeightKg: d.goalWeight == null ? null : fromDisplay(d.goalWeight, d.units) };
  } else if (step === "experience") {
    // keep the running clock if they confirm the same answer again; a new answer restarts it
    const [cur] = await db.select().from(profile).where(eq(profile.userId, user.id));
    const since = cur?.trainingTime === d.trainingTime && cur.trainingSince != null ? cur.trainingSince : sinceFor(d.trainingTime);
    values = { trainingTime: d.trainingTime, trainingSince: since, experience: levelFor(since) };
  } else if (step === "limits") {
    values = { limits: cleanLimits(d.limits), injuries: d.injuries || null };
  } else {
    values = d;
  }
  await db.insert(profile).values({ userId: user.id, ...values }).onConflictDoUpdate({ target: profile.userId, set: { ...values, updatedAt: new Date() } });
  return { ok: true };
}

export async function finishOnboarding(): Promise<SaveResult> {
  const user = await requireUser();
  const [p] = await db.select().from(profile).where(eq(profile.userId, user.id));
  const need = [p?.displayName, p?.gender, p?.birthYear, p?.heightCm, p?.weightKg, p?.goal, p?.experience, p?.location, p?.activity, p?.diet];
  if (need.some((v) => v == null)) return { ok: false, error: "Some steps are missing. Please go back and complete them." };
  await db.update(profile).set({ onboarded: true, updatedAt: new Date() }).where(eq(profile.userId, user.id));
  const day = new Date().toISOString().slice(0, 10);
  const existing = await db.select().from(bodyWeight).where(eq(bodyWeight.userId, user.id));
  if (!existing.some((w) => w.day === day)) await db.insert(bodyWeight).values({ id: crypto.randomUUID(), userId: user.id, day, weightKg: p!.weightKg! });
  revalidatePath("/", "layout");
  return { ok: true };
}
