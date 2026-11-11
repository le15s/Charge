"use server";

import { getProfile, requireUser } from "@/lib/session";
import { analyzeCycle, type Finding, type WorkoutAnalysis } from "@/lib/analyze-workout";
import { PROFILES, goalOf } from "@/lib/goals";
import { z } from "zod";

const Ex = z.object({ exerciseId: z.string().max(120), sets: z.number().int().min(0).max(30), repsMin: z.number().int().min(0).max(200), repsMax: z.number().int().min(0).max(200), restSeconds: z.number().int().min(0).max(1800).nullable() });
const Input = z.object({ workouts: z.array(z.object({ name: z.string().max(80), exercises: z.array(Ex).max(40) })).max(14) });

export type GoalFitResult = { goal: string; goalTitle: string; goalSummary: string; verdict: WorkoutAnalysis["verdict"]; workouts: (WorkoutAnalysis & { name: string })[]; cycle: Finding[] };

/** Check workouts against the signed-in person's goal and level (the numbers live in src/lib/goals.ts and src/lib/analyze-workout.ts). */
export async function analyzeForGoal(raw: unknown): Promise<GoalFitResult | null> {
  const user = await requireUser();
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return null;
  const p = await getProfile(user.id);
  const goal = goalOf(p.goal);
  const r = analyzeCycle({ goal, level: p.experience, limits: p.limits, workouts: parsed.data.workouts });
  return { goal, goalTitle: PROFILES[goal].title, goalSummary: PROFILES[goal].summary, verdict: r.verdict, workouts: r.workouts, cycle: r.cycle };
}
