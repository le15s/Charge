import { EXERCISES, EXERCISE_BY_ID, EXERCISE_BY_NAME, equipmentKey, isTimed, type Exercise } from "./exercises";
import { clashes, cleanLimits, type Limits } from "./limits";

/* ---------- Equipment ---------- */
export const EQUIPMENT_OPTIONS = [
  { id: "dumbbells", label: "Dumbbells" },
  { id: "barbell", label: "Barbell & plates" },
  { id: "bench", label: "Bench" },
  { id: "pullup_bar", label: "Pull-up bar" },
  { id: "kettlebell", label: "Kettlebells" },
  { id: "bands", label: "Resistance bands" },
  { id: "machines", label: "Weight machines" },
  { id: "cables", label: "Cable machine" },
] as const;

export type Ctx = { allowed: Set<string>; pullupBar: boolean; bench: boolean; level: string; limits: Limits };

/** location: gym | home | both. "both" has the whole gym available; pass where="home" to plan a home-only session. */
export function buildCtx(location: string | null, tags: string[] | null, level: string | null, where?: "gym" | "home" | "any", limits?: Limits | null): Ctx {
  if (location === "both") location = where === "home" ? "home" : "gym";
  const t = new Set(tags ?? []);
  const base = ["body only", "none"];
  let allowed: string[];
  if (location === "gym") allowed = [...base, "barbell", "dumbbell", "cable", "machine", "e-z curl bar", "kettlebells"];
  else {
    allowed = [...base];
    if (t.has("dumbbells")) allowed.push("dumbbell");
    if (t.has("barbell")) allowed.push("barbell", "e-z curl bar");
    if (t.has("kettlebell")) allowed.push("kettlebells");
    if (t.has("bands")) allowed.push("bands");
    if (t.has("machines")) allowed.push("machine");
    if (t.has("cables")) allowed.push("cable");
  }
  return { allowed: new Set(allowed), pullupBar: location === "gym" || t.has("pullup_bar"), bench: location === "gym" || t.has("bench"), level: engineLevel(level), limits: cleanLimits(limits) };
}

const LEVELS_OK: Record<string, string[]> = {
  beginner: ["beginner"], intermediate: ["beginner", "intermediate"], advanced: ["beginner", "intermediate", "expert"],
};
const NEEDS_PULLUP = /pull-?ups?|chin-?up/i;
const NEEDS_BENCH = /bench|incline|decline|preacher|lying/i;
const BAD_FALLBACK = /manual|stretch|isometric|assisted|handstand|sled|chain|bands?\b.*(?:reverse|speed)|jump|kneeling|suspended/i;

const usable = (e: Exercise, ctx: Ctx) =>
  ctx.allowed.has(equipmentKey(e)) && (ctx.pullupBar || !NEEDS_PULLUP.test(e.name)) && (ctx.bench || !NEEDS_BENCH.test(e.name)) && clashes(e.name, ctx.limits).length === 0;

/* ---------- Movement slots ---------- */
type Slot = { kind: "c" | "a"; muscles: string[]; pref: string[] };
export const SLOTS: Record<string, Slot> = {
  squat: { kind: "c", muscles: ["quadriceps"], pref: ["Barbell Squat", "Barbell Full Squat", "Hack Squat", "Goblet Squat", "Dumbbell Squat", "Bodyweight Squat"] },
  leg_press: { kind: "c", muscles: ["quadriceps"], pref: ["Leg Press", "Smith Machine Squat", "Split Squat with Dumbbells", "Dumbbell Squat To A Bench", "Bodyweight Squat"] },
  lunge: { kind: "c", muscles: ["quadriceps", "glutes"], pref: ["Dumbbell Lunges", "Barbell Lunge", "Split Squat with Dumbbells", "Bodyweight Walking Lunge"] },
  hinge: { kind: "c", muscles: ["hamstrings", "glutes"], pref: ["Romanian Deadlift", "Barbell Deadlift", "Stiff-Legged Dumbbell Deadlift", "Kettlebell One-Legged Deadlift", "Good Morning", "Single Leg Glute Bridge"] },
  ham_curl: { kind: "a", muscles: ["hamstrings"], pref: ["Lying Leg Curls", "Seated Leg Curl", "Standing Leg Curl", "Stiff-Legged Dumbbell Deadlift", "Natural Glute Ham Raise", "Single Leg Glute Bridge"] },
  quad_iso: { kind: "a", muscles: ["quadriceps"], pref: ["Leg Extensions", "Split Squat with Dumbbells", "Bodyweight Squat"] },
  glute: { kind: "a", muscles: ["glutes"], pref: ["Barbell Hip Thrust", "Barbell Glute Bridge", "Single Leg Glute Bridge", "Butt Lift (Bridge)"] },
  calves: { kind: "a", muscles: ["calves"], pref: ["Standing Calf Raises", "Seated Calf Raise", "Standing Dumbbell Calf Raise", "Calf Raise On A Dumbbell"] },
  chest_press: { kind: "c", muscles: ["chest"], pref: ["Barbell Bench Press - Medium Grip", "Dumbbell Bench Press", "Machine Bench Press", "Dumbbell Floor Press", "Pushups"] },
  chest_incline: { kind: "c", muscles: ["chest"], pref: ["Barbell Incline Bench Press - Medium Grip", "Incline Dumbbell Press", "Leverage Incline Chest Press", "Push-Ups With Feet Elevated", "Incline Push-Up"] },
  chest_fly: { kind: "a", muscles: ["chest"], pref: ["Flat Bench Cable Flyes", "Dumbbell Flyes", "Butterfly", "Incline Dumbbell Flyes", "Push-Up Wide"] },
  vert_pull: { kind: "c", muscles: ["lats"], pref: ["Pullups", "Wide-Grip Lat Pulldown", "Close-Grip Front Lat Pulldown", "V-Bar Pulldown", "Chin-Up", "Inverted Row"] },
  horiz_pull: { kind: "c", muscles: ["middle back", "lats"], pref: ["Bent Over Barbell Row", "One-Arm Dumbbell Row", "Seated Cable Rows", "T-Bar Row with Handle", "Inverted Row"] },
  shoulder_press: { kind: "c", muscles: ["shoulders"], pref: ["Barbell Shoulder Press", "Dumbbell Shoulder Press", "Machine Shoulder (Military) Press", "Arnold Dumbbell Press", "Shoulder Press - With Bands"] },
  lateral: { kind: "a", muscles: ["shoulders"], pref: ["Side Lateral Raise", "Cable Seated Lateral Raise", "Lateral Raise - With Bands"] },
  rear_delt: { kind: "a", muscles: ["shoulders"], pref: ["Face Pull", "Reverse Flyes", "Reverse Machine Flyes", "Cable Rear Delt Fly", "Back Flyes - With Bands"] },
  traps: { kind: "a", muscles: ["traps"], pref: ["Barbell Shrug", "Dumbbell Shrug", "Cable Shrugs"] },
  triceps_a: { kind: "a", muscles: ["triceps"], pref: ["Triceps Pushdown - Rope Attachment", "Triceps Pushdown", "Standing Dumbbell Triceps Extension", "Bench Dips"] },
  triceps_b: { kind: "a", muscles: ["triceps"], pref: ["Lying Triceps Press", "Cable Rope Overhead Triceps Extension", "Dumbbell One-Arm Triceps Extension", "Dips - Triceps Version", "Close-Grip Barbell Bench Press"] },
  biceps_a: { kind: "a", muscles: ["biceps"], pref: ["Barbell Curl", "EZ-Bar Curl", "Dumbbell Bicep Curl", "Standing Biceps Cable Curl"] },
  biceps_b: { kind: "a", muscles: ["biceps"], pref: ["Hammer Curls", "Incline Dumbbell Curl", "Preacher Curl", "Cable Hammer Curls - Rope Attachment"] },
  abs_a: { kind: "a", muscles: ["abdominals"], pref: ["Cable Crunch", "Crunches", "Reverse Crunch"] },
  abs_b: { kind: "a", muscles: ["abdominals"], pref: ["Plank", "Flat Bench Lying Leg Raise", "Decline Crunch"] },
  chest_machine: { kind: "a", muscles: ["chest"], pref: ["Machine Bench Press", "Cable Crossover", "Butterfly", "Pushups"] },
  horiz_pull2: { kind: "c", muscles: ["middle back", "lats"], pref: ["One-Arm Dumbbell Row", "Seated Cable Rows", "T-Bar Row with Handle", "Inverted Row", "Bent Over Barbell Row"] },
  lateral2: { kind: "a", muscles: ["shoulders"], pref: ["Cable Seated Lateral Raise", "Side Lateral Raise", "Lateral Raise - With Bands", "Front Dumbbell Raise"] },
  back_ext: { kind: "a", muscles: ["lower back"], pref: ["Hyperextensions (Back Extensions)", "Hyperextensions With No Hyperextension Bench"] },
};

const TEMPLATES: Record<string, { name: string; slots: string[] }> = {
  fbA: { name: "Full Body A", slots: ["squat", "chest_press", "horiz_pull", "vert_pull", "shoulder_press", "ham_curl", "biceps_a", "abs_a"] },
  fbB: { name: "Full Body B", slots: ["hinge", "chest_incline", "vert_pull", "lunge", "horiz_pull", "lateral", "triceps_b", "abs_b"] },
  fbC: { name: "Full Body C", slots: ["leg_press", "chest_incline", "horiz_pull", "shoulder_press", "vert_pull", "glute", "calves", "abs_a"] },
  upA: { name: "Upper A", slots: ["chest_press", "horiz_pull", "shoulder_press", "vert_pull", "triceps_a", "biceps_a", "lateral", "rear_delt"] },
  loA: { name: "Lower A", slots: ["squat", "hinge", "lunge", "ham_curl", "calves", "abs_a", "back_ext", "glute"] },
  upB: { name: "Upper B", slots: ["chest_incline", "vert_pull", "shoulder_press", "horiz_pull", "chest_fly", "triceps_b", "biceps_b", "lateral"] },
  loB: { name: "Lower B", slots: ["hinge", "leg_press", "glute", "ham_curl", "quad_iso", "calves", "abs_b", "lunge"] },
  push: { name: "Push", slots: ["chest_press", "shoulder_press", "chest_incline", "lateral", "triceps_a", "chest_fly", "triceps_b"] },
  pull: { name: "Pull", slots: ["vert_pull", "horiz_pull", "rear_delt", "biceps_a", "biceps_b", "traps", "abs_a"] },
  legs: { name: "Legs", slots: ["squat", "hinge", "leg_press", "ham_curl", "calves", "quad_iso", "glute", "abs_a"] },
  chestDay: { name: "Chest", slots: ["chest_press", "chest_incline", "chest_fly", "chest_machine", "abs_a", "abs_b"] },
  chestTri: { name: "Chest & Triceps", slots: ["chest_press", "chest_incline", "triceps_a", "chest_fly", "triceps_b", "abs_a"] },
  backDay: { name: "Back", slots: ["vert_pull", "horiz_pull", "horiz_pull2", "rear_delt", "traps", "back_ext"] },
  backBi: { name: "Back & Biceps", slots: ["vert_pull", "horiz_pull", "biceps_a", "rear_delt", "biceps_b", "abs_b"] },
  shoulderDay: { name: "Shoulders", slots: ["shoulder_press", "lateral", "rear_delt", "lateral2", "abs_b", "abs_a"] },
  shoulderArms: { name: "Shoulders & Arms", slots: ["shoulder_press", "lateral", "biceps_a", "triceps_a", "rear_delt", "biceps_b", "triceps_b"] },
  armDay: { name: "Arms", slots: ["biceps_a", "triceps_a", "biceps_b", "triceps_b", "abs_a", "abs_b"] },
};

import { goalOf, PROFILES, type Role } from "./goals";
import { engineLevel } from "./level";
import { estimateMinutes, SESSION_NAMES, SPLITS, type SplitId } from "./splits";
export { SPLITS };
export type { SplitId };

/* ---------- Proposal ---------- */
export type Proposed = { exerciseId: string; slot: string; sets: number; repsMin: number; repsMax: number; restSeconds: number };
export type ProposedWorkout = { name: string; exercises: Proposed[] };
/** `minutes`: how long each workout should take (by position in the cycle). Null or missing = the usual size. */
export type PlanInput = { split: SplitId; rotationId: string; size: number; goal: string; seed?: number; ctx: Ctx; minutes?: (number | null)[] };

/**
 * The site works out how big a session should be, so nobody has to type their schedule.
 * Starts from experience and goal, then follows the user's real workouts once there are a few.
 */
export function inferSessionSize(o: { experience: string | null; goal: string | null; recentMinutes?: number[] }): number {
  let n = o.experience === "expert" ? 8 : o.experience === "advanced" ? 7 : o.experience === "intermediate" ? 6 : 5;
  n += PROFILES[goalOf(o.goal)].sizeDelta;
  const m = (o.recentMinutes ?? []).filter((x) => x >= 15 && x <= 180);
  if (m.length >= 3) {
    const avg = m.reduce((a, b) => a + b, 0) / m.length;
    n = Math.round((n + avg / 9) / 2);
  }
  return Math.max(4, Math.min(8, n));
}

/**
 * Sets, reps and rest for one exercise, from the goal's profile (src/lib/goals.ts). `rank` is its place among the session's compound lifts (0 = the main lift).
 * The profile lists a few equally good rep and rest choices; `rand` picks one, so two people (or two tries) don't get the same numbers.
 * Beginners get a set fewer on the main lift and on accessories so they can recover and learn the movements; advanced lifters chasing strength get a fifth set.
 */
function scheme(goalId: string, level: string, kind: "c" | "a", slot: string, rank = 0, rand: () => number = () => 0) {
  const goal = goalOf(goalId);
  const beg = level === "beginner", adv = level === "advanced";
  if (slot.startsWith("abs")) return goal === "endurance" ? { sets: 3, lo: 15, hi: 25, rest: 30 } : { sets: 3, lo: 12, hi: 20, rest: 45 };
  if (slot === "calves") return goal === "endurance" ? { sets: 3, lo: 15, hi: 25, rest: 45 } : goal === "lose" ? { sets: 3, lo: 12, hi: 15, rest: 45 } : { sets: beg || goal === "maintain" ? 3 : 4, lo: 10, hi: 15, rest: 60 };
  const role: Role = kind === "a" ? "accessory" : rank === 0 ? "main" : "support";
  const ideal = PROFILES[goal].ideal[role];
  const v = ideal.variants[Math.floor(rand() * ideal.variants.length)];
  let sets = ideal.sets, lo = v.lo, hi = v.hi;
  if (beg && role === "main") sets = Math.max(2, sets - 1);
  if (beg && role === "accessory") sets = Math.max(2, sets - 1);
  if (adv && role === "main" && goal === "strength") sets += 1;
  if (beg && goal === "strength" && role === "main") { lo = Math.max(lo, 5); hi = Math.max(hi, lo); }
  return { sets, lo, hi, rest: v.rest };
}

function candidatesForSlot(slotKey: string, ctx: Ctx): Exercise[] {
  const slot = SLOTS[slotKey];
  const pref = slot.pref.map((n) => EXERCISE_BY_NAME[n.toLowerCase()]).filter((e): e is Exercise => !!e && usable(e, ctx));
  const lv = LEVELS_OK[ctx.level] ?? LEVELS_OK.intermediate;
  const rest = EXERCISES.filter(
    (e) => e.category === "strength" && e.force !== "static" && !BAD_FALLBACK.test(e.name) && lv.includes(e.level) && usable(e, ctx) &&
      e.primaryMuscles.some((m) => slot.muscles.includes(m)) && !pref.includes(e) && (slot.kind === "a" || e.mechanic === "compound"),
  );
  // a beginner gets the easier choices from the list first (a lat pulldown before pull-ups), the harder ones only as a fallback
  const easy = pref.filter((e) => lv.includes(e.level)), hard = pref.filter((e) => !lv.includes(e.level));
  return [...easy, ...hard, ...rest.filter((e) => !pref.includes(e))];
}

function rng(seed: number) { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Movements that train the same muscles in the same way, so a session can use either (a little variety without changing what the session does). */
const ALT_SLOT: Record<string, string> = {
  biceps_a: "biceps_b", biceps_b: "biceps_a", triceps_a: "triceps_b", triceps_b: "triceps_a", lateral: "lateral2", lateral2: "lateral",
  abs_a: "abs_b", abs_b: "abs_a", chest_fly: "chest_machine", chest_machine: "chest_fly",
};
/** A random pick that favours the front of the list (the best choices) but not always the first one. */
function pickWeighted<T>(list: T[], rand: () => number): T {
  const w = [5, 3, 2, 1].slice(0, Math.min(list.length, 4));
  let r = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return list[i]; }
  return list[0];
}

/** `seed` makes the choices: the same seed gives the same plan, a different one gives a different (equally valid) plan. */
export function generatePlan(input: PlanInput): ProposedWorkout[] {
  const { goal, ctx, size: n } = input;
  const opt = SPLITS.find((x) => x.id === input.split);
  const rot = opt?.rotations.find((r) => r.id === input.rotationId) ?? opt?.rotations[0];
  if (!rot) return [];
  const rand = rng(((input.seed ?? 1) * 7919 + rot.keys.length) | 0);
  const usedBySlot: Record<string, Set<string>> = {};
  const keys = rot.keys;
  return keys.map((k, i) => {
    const t = TEMPLATES[k];
    const used = new Set<string>();
    const all: Proposed[] = [];
    let rank = 0; // how many compound lifts came before this one in the session
    for (const baseSlot of t.slots) {
      // single-joint work: sometimes use the twin movement (a different curl or fly) when the session doesn't already have it
      const twin = ALT_SLOT[baseSlot];
      const slotKey = twin && SLOTS[baseSlot].kind === "a" && !t.slots.includes(twin) && rand() < 0.35 ? twin : baseSlot;
      const cands = candidatesForSlot(slotKey, ctx).filter((e) => !used.has(e.id));
      if (!cands.length) continue;
      const prev = (usedBySlot[slotKey] ??= new Set<string>());
      const fresh = cands.filter((e) => !prev.has(e.id));
      const e = pickWeighted(fresh.length ? fresh : cands, rand);
      used.add(e.id); prev.add(e.id);
      const kind = SLOTS[slotKey].kind;
      const sc = scheme(goal, ctx.level, kind, slotKey, rank, rand);
      if (kind === "c") rank++;
      const timed = isTimed(e);
      all.push({ exerciseId: e.id, slot: slotKey, sets: sc.sets, repsMin: timed ? 30 : sc.lo, repsMax: timed ? 60 : sc.hi, restSeconds: sc.rest });
    }
    const target = input.minutes?.[i] ?? null;
    const exercises = target ? fitToMinutes(all, target) : all.slice(0, n);
    // a session that shows up twice in the cycle gets an A and a B version (different exercises, same muscles)
    const dup = keys.slice(0, i).filter((x) => x === k).length;
    const twice = keys.filter((x) => x === k).length > 1;
    return { name: (SESSION_NAMES[k] ?? t.name) + (twice ? ` ${String.fromCharCode(65 + dup)}` : ""), exercises };
  });
}

/**
 * Pick the exercises (in priority order, big lifts first) that fill the time you have.
 * Too many for the time: the last ones drop off. Room to spare: the next exercises on the list join in, then the big lifts get an extra set.
 */
export function fitToMinutes(all: Proposed[], target: number): Proposed[] {
  const min = (xs: Proposed[]) => estimateMinutes(xs);
  const room = target + 2;
  let out: Proposed[] = [];
  for (const e of all) { if (out.length >= 3 && min([...out, e]) > room) break; out = [...out, e]; }
  // short on time even with three: trim rests and accessory sets
  while (out.length > 2 && min(out) > room) out = out.slice(0, -1);
  if (min(out) > room) out = out.map((e, i) => ({ ...e, restSeconds: Math.min(e.restSeconds, 90), sets: i ? Math.min(e.sets, 2) : e.sets }));
  // spare minutes and nothing left to add: one more set on the main lifts
  for (let pass = 0; pass < 2 && out.length === all.length && min(out) < target - 8; pass++) {
    out = out.map((e) => (SLOTS[e.slot]?.kind === "c" && e.sets < 5 && min(out) < target - 8 ? { ...e, sets: e.sets + 1 } : e));
  }
  return out;
}

/** "Not feeling this one" — propose another exercise for the same slot or muscle, skipping anything already used or rejected. */
export function alternativeFor(exerciseId: string, slot: string | null, ctx: Ctx, exclude: string[]): Exercise | null {
  const skip = new Set([exerciseId, ...exclude]);
  const cur = EXERCISE_BY_ID[exerciseId];
  let key = slot && SLOTS[slot] ? slot : null;
  if (!key && cur) {
    key = Object.keys(SLOTS).find((k) => SLOTS[k].muscles.some((m) => cur.primaryMuscles.includes(m)) && SLOTS[k].kind === (cur.mechanic === "compound" ? "c" : "a")) ?? null;
    if (!key) key = Object.keys(SLOTS).find((k) => SLOTS[k].muscles.some((m) => cur.primaryMuscles.includes(m))) ?? null;
  }
  if (!key) return null;
  const list = candidatesForSlot(key, ctx).filter((e) => !skip.has(e.id));
  if (list.length) return list[0];
  // widen: any usable strength exercise for the same primary muscle
  const m = cur?.primaryMuscles[0];
  return EXERCISES.find((e) => e.category === "strength" && e.primaryMuscles.includes(m ?? "") && usable(e, ctx) && !skip.has(e.id) && !BAD_FALLBACK.test(e.name)) ?? null;
}

/** Slot for a bare exercise id (used when swapping in a saved routine). */
export function slotOf(exerciseId: string): string | null {
  const e = EXERCISE_BY_ID[exerciseId]; if (!e) return null;
  for (const [k, s] of Object.entries(SLOTS)) if (s.pref.some((n) => n.toLowerCase() === e.name.toLowerCase())) return k;
  return null;
}
