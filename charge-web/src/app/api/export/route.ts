import { db } from "@/db";
import { bodyMeasure, bodyWeight, customFood, foodLog, mealPlan, menuItem, profile, routine, routineExercise, shoppingItem, stockItem, userRecipe, workout, workoutExercise, workoutSet } from "@/db/schema";
import { EXERCISE_BY_ID } from "@/lib/exercises";
import { getSession } from "@/lib/session";
import { eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Everything the signed-in person has saved, as one file they can keep: JSON (all of it) or CSV (every logged set, for spreadsheets). Progress photos are not included (they are large; save them from the Body page). Chat and community posts are not included either. */
const chunks = <T,>(a: T[], n = 400) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const csv = (v: unknown) => { if (typeof v === "number") return String(v); const s = v == null ? "" : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : /^[=+\-@\t]/.test(s) ? `'${s}` : s; }; // a leading = + - @ would run as a formula in a spreadsheet

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Sign in first", { status: 401 });
  const uid = session.user.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mine = (t: any) => db.select().from(t).where(eq(t.userId, uid)) as unknown as Promise<Record<string, unknown>[]>;

  const [prof, weights, measures, routines, workouts, foods, customFoods, recipes, plans, stock, shopping, menu] = await Promise.all([
    mine(profile), mine(bodyWeight), mine(bodyMeasure), mine(routine), mine(workout), mine(foodLog), mine(customFood), mine(userRecipe), mine(mealPlan), mine(stockItem), mine(shoppingItem), mine(menuItem),
  ]);
  const byIds = async <R,>(table: unknown, col: unknown, ids: string[]) => (await Promise.all(chunks(ids).map((c) => db.select().from(table as never).where(inArray(col as never, c)) as unknown as Promise<R[]>))).flat();
  const rEx = await byIds<Record<string, unknown>>(routineExercise, routineExercise.routineId, routines.map((r) => r.id as string));
  const wEx = await byIds<Record<string, unknown>>(workoutExercise, workoutExercise.workoutId, workouts.map((w) => w.id as string));
  const sets = await byIds<Record<string, unknown>>(workoutSet, workoutSet.workoutExerciseId, wEx.map((e) => e.id as string));

  const format = new URL(req.url).searchParams.get("format");
  const day = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    const exById = new Map(wEx.map((e) => [e.id as string, e]));
    const wById = new Map(workouts.map((w) => [w.id as string, w]));
    const rows = sets
      .map((s) => { const e = exById.get(s.workoutExerciseId as string)!; const w = wById.get(e.workoutId as string)!; return { s, e, w }; })
      .sort((a, b) => (a.w.startedAt as Date).getTime() - (b.w.startedAt as Date).getTime() || (a.e.position as number) - (b.e.position as number) || (a.s.position as number) - (b.s.position as number));
    const head = ["date", "workout", "exercise", "set", "type", "weight_kg", "reps", "done"];
    const lines = [head.join(",")].concat(rows.map(({ s, e, w }) => [new Date(w.startedAt as Date).toISOString().slice(0, 10), w.name, EXERCISE_BY_ID[e.exerciseId as string]?.name ?? e.exerciseId, (s.position as number) + 1, s.kind, s.weightKg, s.reps, s.done ? "yes" : "no"].map(csv).join(",")));
    return new Response("﻿" + lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="charge-sets-${day}.csv"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  }
  const body = {
    exportedAt: new Date().toISOString(), app: "Charge", note: "Weights are in kg and lengths in cm. Progress photos, chat and community posts are not included.",
    email: session.user.email, profile: prof[0] ?? null, bodyWeight: weights, bodyMeasurements: measures,
    routines: routines.map((r) => ({ ...r, exercises: rEx.filter((e) => e.routineId === r.id) })),
    workouts: workouts.map((w) => ({ ...w, exercises: wEx.filter((e) => e.workoutId === w.id).map((e) => ({ ...e, name: EXERCISE_BY_ID[e.exerciseId as string]?.name ?? null, sets: sets.filter((s) => s.workoutExerciseId === e.id) })) })),
    foodLog: foods, customFoods: customFoods, recipes, mealPlan: plans, stock, shoppingList: shopping, menu,
  };
  return new Response(JSON.stringify(body, null, 1), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="charge-export-${day}.json"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
