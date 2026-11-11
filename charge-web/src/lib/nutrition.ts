import { FOOD_PROFILES, goalOf } from "./goals";
export type TargetInput = { weightKg: number; heightCm: number; age: number; gender: string; activity: number; goal: string };
export function calcTargets(p: TargetInput) {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.gender === "female" ? -161 : 5);
  const tdee = bmr * (p.activity || 1.375);
  const fp = FOOD_PROFILES[goalOf(p.goal)];
  const adj = fp.calories.adj;
  const floor = p.gender === "female" ? 1200 : 1500;
  const kcal = Math.max(floor, Math.round((tdee * (1 + adj)) / 10) * 10);
  const gkg = fp.protein.target;
  const protein = Math.round(p.weightKg * gkg);
  const fat = Math.max(Math.round(p.weightKg * 0.85), Math.round((kcal * 0.22) / 9));
  const carbs = Math.max(40, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein, fat, carbs, water: Math.round((p.weightKg * 35) / 100) * 100 };
}
