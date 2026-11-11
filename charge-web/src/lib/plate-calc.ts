// Client-safe. Plate maths and "what to try next time" suggestions. All weights here are in the user's display unit unless a name says kg.
import type { Units } from "./units";

/** Plates people commonly own, heaviest first, in each unit. */
export const PLATE_SIZES: Record<Units, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25, 1, 0.5],
  lb: [55, 45, 35, 25, 10, 5, 2.5, 1.25],
};
export const DEFAULT_PLATES: Record<Units, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};
export const BAR_CHOICES: Record<Units, number[]> = { kg: [20, 15, 10], lb: [45, 35, 25] };

/** Each plate size borrows one of the Charge plate colours (the --pc-N variables), so the stack looks like the rest of the app. */
const COLOR_ORDER = [0, 1, 2, 3, 5, 4, 6, 7, 10];
export const plateColorIndex = (size: number, units: Units) => {
  const i = PLATE_SIZES[units].indexOf(size);
  return COLOR_ORDER[i < 0 ? 0 : i % COLOR_ORDER.length];
};

export type PlateResult = { perSide: { size: number; count: number }[]; total: number; leftover: number; belowBar: boolean };

/** Plates to load on each side of the bar for a target weight, using only the plate sizes you own. */
export function calcPlates(target: number, bar: number, owned: number[]): PlateResult {
  const sizes = [...owned].sort((a, b) => b - a);
  const belowBar = target < bar;
  let side = Math.max(0, (target - bar) / 2);
  const perSide: { size: number; count: number }[] = [];
  let loaded = 0;
  for (const s of sizes) {
    const n = Math.floor((side + 1e-6) / s);
    if (n > 0) { perSide.push({ size: s, count: n }); side -= n * s; loaded += n * s; }
  }
  const total = Math.round((bar + loaded * 2) * 100) / 100;
  return { perSide, total, leftover: Math.round(Math.max(0, target - total) * 100) / 100, belowBar };
}

export type Suggestion = {
  kind: "up" | "stay" | "down" | "deload";
  /** Weight in the user's unit */
  weight: number;
  /** Rep target */
  reps: number;
  text: string;
};
type Past = { weightKg: number | null; reps: number | null; kind: string };

const round = (n: number, step: number) => Math.round(n / step) * step;

/** Double progression: hit the top of the rep range on every set, then add a little weight; miss badly and ease off. Uses last session only. */
const e1 = (s: Past) => (s.weightKg && s.reps ? s.weightKg * (1 + Math.min(s.reps, 12) / 30) : 0);
const best = (l: Past[]) => Math.max(0, ...l.filter((x) => x.kind !== "warmup").map(e1));
/** Three sessions in a row with no gain (the newest two are no better than the one before them), and the last one was not already a lighter week. */
export function isStalled(latest: Past[], earlier: Past[][] | undefined) {
  if (!earlier || earlier.length < 2) return false;
  const [s0, s1, s2] = [best(latest), best(earlier[0]), best(earlier[1])];
  if (!s0 || !s1 || !s2) return false;
  if (s0 < s1 * 0.92) return false; // already took it easier last time
  return Math.max(s0, s1) <= s2 * 1.01;
}

export function suggestNext(prev: Past[], repsMin: number, repsMax: number, units: Units, toDisplay: (kg: number | null) => number | null, equipment: string | null, earlier?: Past[][]): Suggestion | null {
  const sets = prev.filter((p) => p.kind !== "warmup" && p.weightKg && p.reps);
  if (!sets.length || repsMax <= 0) return null;
  const top = Math.max(...sets.map((s) => s.weightKg!));
  const at = sets.filter((s) => s.weightKg === top);
  const w = toDisplay(top) ?? 0;
  const reps = at.map((s) => s.reps!);
  const avg = reps.reduce((a, b) => a + b, 0) / reps.length;
  const small = equipment === "dumbbell" || equipment === "kettlebells" || equipment === "e-z curl bar";
  const step = units === "kg" ? (small ? 1 : 2.5) : (small ? 2.5 : 5);
  const fmt = (n: number) => `${Math.round(n * 100) / 100} ${units}`;
  if (isStalled(prev, earlier) && !reps.every((r) => r >= repsMax)) {
    const lighter = Math.max(step, round(w * 0.9, step));
    return { kind: "deload", weight: lighter, reps: repsMax, text: `No progress for 3 sessions at ${fmt(w)}. Take a lighter week: ${fmt(lighter)} for ${repsMax} reps, then build back up.` };
  }
  if (reps.every((r) => r >= repsMax)) {
    return { kind: "up", weight: w + step, reps: repsMin, text: `You hit ${repsMax} reps on every set. Try ${fmt(w + step)} for ${repsMin}+ reps.` };
  }
  if (avg < repsMin - 2) {
    const lighter = Math.max(step, round(w * 0.9, step));
    return { kind: "down", weight: lighter, reps: repsMax, text: `That looked heavy. Ease off to ${fmt(lighter)} and build back up.` };
  }
  const target = Math.min(repsMax, Math.max(...reps) + 1);
  return { kind: "stay", weight: w, reps: target, text: `Stay at ${fmt(w)} and aim for ${target} reps. Add weight once every set reaches ${repsMax}.` };
}
