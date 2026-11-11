// Client-safe. Training programs written for Charge: the exercise choices and set/rep schemes follow well-known public programmes; the wording is our own.
import { EXERCISE_BY_ID } from "./exercises";

export type PEx = { id: string; sets: number; min: number; max: number; rest: number };
export type PDay = { name: string; ex: PEx[] };
export type Program = { id: string; name: string; level: "beginner" | "intermediate"; perWeek: number; blurb: string; how: string[]; days: PDay[]; wave?: boolean };

const SQ = "Barbell_Full_Squat", BP = "Barbell_Bench_Press_-_Medium_Grip", DL = "Barbell_Deadlift", OHP = "Standing_Military_Press";
export const LIFTS = [{ key: "squat", label: "Squat", id: SQ, step: 5 }, { key: "bench", label: "Bench press", id: BP, step: 2.5 }, { key: "deadlift", label: "Deadlift", id: DL, step: 5 }, { key: "press", label: "Overhead press", id: OHP, step: 2.5 }] as const;
export type LiftKey = (typeof LIFTS)[number]["key"];
const x = (id: string, sets: number, min: number, max = min, rest = 120): PEx => ({ id, sets, min, max, rest });

export const PROGRAMS: Program[] = [
  {
    id: "starting-strength", name: "Starting Strength style", level: "beginner", perWeek: 3,
    blurb: "Three days a week, two alternating workouts, a few big barbell lifts. You add a little weight every session until it stops being easy. A simplified version of the well-known plan: Workout B uses a barbell row where the original has power cleans.",
    how: ["Alternate workout A and B: A, B, A one week, B, A, B the next.", "Every set is 5 reps (the deadlift is a single set of 5). When you finish all reps, add 2.5 kg (5 lb) next time. Charge suggests it for you.", "Rest 2 to 3 minutes between sets. Eat enough and sleep well.", "When you get stuck for a few sessions, drop the weight by about 10% and build back up."],
    days: [
      { name: "Workout A", ex: [x(SQ, 3, 5, 5, 180), x(BP, 3, 5, 5, 150), x(DL, 1, 5, 5, 180)] },
      { name: "Workout B", ex: [x(SQ, 3, 5, 5, 180), x(OHP, 3, 5, 5, 150), x("Bent_Over_Barbell_Row", 3, 5, 5, 150)] },
    ],
  },
  {
    id: "gzclp", name: "GZCLP style", level: "beginner", perWeek: 4,
    blurb: "Four days a week with a heavy main lift, a lighter second lift and small extras. A good first step beyond a pure beginner plan.",
    how: ["Heavy lift (T1): 5 sets of 3. Make the last set as many reps as you can safely do.", "Second lift (T2): 3 sets of 10 at a lighter weight.", "Extras (T3): 3 sets of 15 or more. When you can do 25 on the last set, add weight.", "Add weight to the main lifts each week while all sets are done. When a lift stalls, lower the weight and aim for a few more reps."],
    days: [
      { name: "Day 1", ex: [x(SQ, 5, 3, 3, 180), x(BP, 3, 10, 10, 120), x("Wide-Grip_Lat_Pulldown", 3, 15, 25, 75)] },
      { name: "Day 2", ex: [x(OHP, 5, 3, 3, 180), x(DL, 3, 10, 10, 150), x("One-Arm_Dumbbell_Row", 3, 15, 25, 75)] },
      { name: "Day 3", ex: [x(BP, 5, 3, 3, 180), x(SQ, 3, 10, 10, 150), x("Wide-Grip_Lat_Pulldown", 3, 15, 25, 75)] },
      { name: "Day 4", ex: [x(DL, 5, 3, 3, 180), x(OHP, 3, 10, 10, 120), x("One-Arm_Dumbbell_Row", 3, 15, 25, 75)] },
    ],
  },
  {
    id: "five-three-one", name: "5/3/1 style", level: "intermediate", perWeek: 4, wave: true,
    blurb: "Four days a week, one main lift per day, and weights that follow a four-week wave based on a training max. Slow, steady, built to last.",
    how: ["Set a training max for each lift: about 90% of the most you could lift for one clean rep.", "Each week has three main sets at set percentages of that max: week 1 sets of 5, week 2 sets of 3, week 3 a 5, a 3 and a 1, week 4 an easy deload. The last set of weeks 1 to 3 is \"as many reps as you can\".", "After the main sets, do the extra work listed below the lift.", "After week 4, add 2.5 kg (5 lb) to the press and bench maxes and 5 kg (10 lb) to the squat and deadlift maxes. Charge does this when you finish the cycle."],
    days: [
      { name: "Squat day", ex: [x(SQ, 3, 5, 5, 180), x("Leg_Press", 5, 10, 10, 90), x("Hanging_Leg_Raise", 4, 10, 15, 60)] },
      { name: "Bench day", ex: [x(BP, 3, 5, 5, 180), x("Dumbbell_Bicep_Curl", 5, 10, 10, 75), x("Bent_Over_Barbell_Row", 5, 10, 10, 90)] },
      { name: "Deadlift day", ex: [x(DL, 3, 5, 5, 180), x("Hyperextensions_Back_Extensions", 4, 10, 15, 75), x("Crunches", 4, 12, 20, 60)] },
      { name: "Press day", ex: [x(OHP, 3, 5, 5, 180), x("Chin-Up", 5, 6, 10, 90), x("Triceps_Pushdown", 5, 10, 15, 75)] },
    ],
  },
  {
    id: "ppl", name: "Push / Pull / Legs", level: "intermediate", perWeek: 3,
    blurb: "Three days that split the body into pushing, pulling and legs. Moderate reps, steady volume, easy to repeat twice a week.",
    how: ["Run Push, Pull, Legs in order. Three days a week, or six if you like.", "Pick a weight where the last rep of each set is hard but clean. When you reach the top of the rep range on every set, add weight.", "Rest 60 to 120 seconds between sets."],
    days: [
      { name: "Push", ex: [x(BP, 4, 6, 10), x("Incline_Dumbbell_Press", 3, 8, 12, 90), x("Dumbbell_Shoulder_Press", 3, 8, 12, 90), x("Side_Lateral_Raise", 3, 12, 15, 60), x("Triceps_Pushdown", 3, 10, 15, 60)] },
      { name: "Pull", ex: [x("Pullups", 4, 6, 10), x("Bent_Over_Barbell_Row", 4, 6, 10), x("Seated_Cable_Rows", 3, 10, 12, 90), x("Face_Pull", 3, 12, 15, 60), x("Barbell_Curl", 3, 8, 12, 60)] },
      { name: "Legs", ex: [x(SQ, 4, 5, 8, 150), x("Romanian_Deadlift", 3, 8, 10, 120), x("Leg_Press", 3, 10, 15, 90), x("Lying_Leg_Curls", 3, 10, 15, 60), x("Standing_Calf_Raises", 4, 10, 15, 60)] },
    ],
  },
  {
    id: "upper-lower", name: "Upper / Lower", level: "beginner", perWeek: 4,
    blurb: "Four days: two upper-body days and two lower-body days. A balanced split that hits every muscle twice a week.",
    how: ["Run Upper, Lower, Upper, Lower with a rest day between pairs (for example Mon, Tue, Thu, Fri).", "Aim for the top of each rep range on every set, then add a little weight.", "Rest 60 to 120 seconds between sets."],
    days: [
      { name: "Upper A", ex: [x(BP, 4, 5, 8, 150), x("Bent_Over_Barbell_Row", 4, 6, 10, 120), x("Dumbbell_Shoulder_Press", 3, 8, 12, 90), x("Wide-Grip_Lat_Pulldown", 3, 8, 12, 90), x("Barbell_Curl", 2, 10, 12, 60), x("Triceps_Pushdown", 2, 10, 12, 60)] },
      { name: "Lower A", ex: [x(SQ, 4, 5, 8, 150), x("Romanian_Deadlift", 3, 8, 10, 120), x("Leg_Extensions", 3, 10, 15, 60), x("Lying_Leg_Curls", 3, 10, 15, 60), x("Standing_Calf_Raises", 4, 10, 15, 60)] },
      { name: "Upper B", ex: [x(OHP, 4, 5, 8, 150), x("Pullups", 4, 6, 10, 120), x("Incline_Dumbbell_Press", 3, 8, 12, 90), x("Seated_Cable_Rows", 3, 8, 12, 90), x("Side_Lateral_Raise", 3, 12, 15, 60), x("Dumbbell_Bicep_Curl", 2, 10, 12, 60)] },
      { name: "Lower B", ex: [x(DL, 3, 4, 6, 180), x("Front_Barbell_Squat", 3, 6, 10, 120), x("Barbell_Hip_Thrust", 3, 8, 12, 90), x("Leg_Press", 3, 10, 15, 90), x("Hanging_Leg_Raise", 3, 10, 15, 60)] },
    ],
  },
];
export const PROGRAM_BY_ID = new Map(PROGRAMS.map((p) => [p.id, p]));

/* ---------- the 5/3/1 wave ---------- */
export const WAVE: { week: number; label: string; sets: { pct: number; reps: number; amrap: boolean }[] }[] = [
  { week: 1, label: "Fives", sets: [{ pct: 65, reps: 5, amrap: false }, { pct: 75, reps: 5, amrap: false }, { pct: 85, reps: 5, amrap: true }] },
  { week: 2, label: "Threes", sets: [{ pct: 70, reps: 3, amrap: false }, { pct: 80, reps: 3, amrap: false }, { pct: 90, reps: 3, amrap: true }] },
  { week: 3, label: "Five, three, one", sets: [{ pct: 75, reps: 5, amrap: false }, { pct: 85, reps: 3, amrap: false }, { pct: 95, reps: 1, amrap: true }] },
  { week: 4, label: "Deload", sets: [{ pct: 40, reps: 5, amrap: false }, { pct: 50, reps: 5, amrap: false }, { pct: 60, reps: 5, amrap: false }] },
];
/** Round a weight to the nearest pair of the smallest plates (2.5 kg steps, or 5 lb). */
export const roundTo = (kg: number, step = 2.5) => Math.round(kg / step) * step;
export const waveWeights = (tmKg: number, week: number) => (WAVE[week - 1] ?? WAVE[0]).sets.map((s) => ({ ...s, kg: roundTo((tmKg * s.pct) / 100) }));
/** A training max is 90% of your estimated one-rep max. */
export const trainingMax = (weightKg: number, reps: number) => roundTo(weightKg * (1 + Math.min(reps, 12) / 30) * 0.9);
export const cycleBump = (lift: LiftKey) => (lift === "squat" || lift === "deadlift" ? 5 : 2.5);

/* ---------- sharing workouts as a code ---------- */
export type ShareWorkout = { name: string; exercises: { exerciseId: string; sets: number; repsMin: number; repsMax: number; restSeconds: number }[] };
const b64 = {
  enc: (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))),
};
export function encodeShare(ws: ShareWorkout[]) {
  return "CH1." + b64.enc(JSON.stringify(ws.map((w) => [w.name, w.exercises.map((e) => [e.exerciseId, e.sets, e.repsMin, e.repsMax, e.restSeconds])])));
}
/** Read a share code. Unknown exercises are dropped; anything odd gives null. */
export function decodeShare(code: string): ShareWorkout[] | null {
  try {
    const c = code.trim().replace(/^.*[?&]import=/, "");
    if (!c.startsWith("CH1.") || c.length > 20000) return null;
    const raw = JSON.parse(b64.dec(c.slice(4))) as unknown;
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > 14) return null;
    const out: ShareWorkout[] = [];
    for (const w of raw) {
      if (!Array.isArray(w) || typeof w[0] !== "string" || !Array.isArray(w[1])) return null;
      const exercises = (w[1] as unknown[]).slice(0, 30).flatMap((e) => {
        if (!Array.isArray(e) || typeof e[0] !== "string" || !EXERCISE_BY_ID[e[0]]) return [];
        const n = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
        const min = n(e[2], 1, 200, 8), max = n(e[3], 1, 200, 12);
        return [{ exerciseId: e[0], sets: n(e[1], 1, 15, 3), repsMin: Math.min(min, max), repsMax: Math.max(min, max), restSeconds: n(e[4], 0, 600, 90) }];
      });
      out.push({ name: w[0].replace(/[<>]/g, "").trim().slice(0, 80) || "Shared workout", exercises });
    }
    return out.some((w) => w.exercises.length) ? out : null;
  } catch { return null; }
}
