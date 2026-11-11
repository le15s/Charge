// Client-safe split definitions (the engine in program.ts imports the exercise dataset).
export type SplitId = "full_body" | "upper_lower" | "ppl" | "bro" | "ppl_ul";

/** Display names of the session templates used by the engine. */
export const SESSION_NAMES: Record<string, string> = {
  fbA: "Full Body A", fbB: "Full Body B", fbC: "Full Body C",
  upA: "Upper A", loA: "Lower A", upB: "Upper B", loB: "Lower B",
  push: "Push", pull: "Pull", legs: "Legs",
  chestDay: "Chest", backDay: "Back", shoulderDay: "Shoulders", armDay: "Arms", shoulderArms: "Shoulders & Arms",
  chestTri: "Chest & Triceps", backBi: "Back & Biceps",
};
/** Colour family of a session, used for tags (push = red plate, pull = blue, legs = yellow, upper = blue, lower = green...). */
export const SESSION_TONE: Record<string, "red" | "blue" | "yellow" | "green" | "steel"> = {
  push: "red", pull: "blue", legs: "yellow", fbA: "steel", fbB: "steel", fbC: "steel",
  upA: "red", upB: "red", loA: "green", loB: "green",
  chestDay: "red", backDay: "blue", shoulderDay: "red", armDay: "steel", shoulderArms: "steel", chestTri: "red", backBi: "blue",
};

/** A rotation is an endless cycle: finish the last workout and you start again from the first. No fixed weekdays. */
export type Rotation = {
  id: string; keys: string[]; note: string;
  /** Every session trains most of the body, so each one needs a rest day after it. Everything else rests by design: the next session works different muscles. */
  restDay?: boolean;
};
export type SplitOption = { id: SplitId; name: string; blurb: string; muscles: string; rotations: Rotation[] };

/*
 * Rules every rotation follows (checked by the recovery test over every split, goal, level and equipment choice):
 *  - Two sessions in a row never train the same muscle hard, and that includes the jump from the last session back to the first.
 *  - Every muscle shows up equally often per cycle, so nothing falls behind.
 *  - A cycle is the shortest repeating unit. How many days you train per week just decides how fast it rolls, so 4 days of
 *    Push / Pull / Legs is Push, Pull, Legs, Push and then the cycle carries on with Pull, Legs, Push, Pull.
 */
export const SPLITS: SplitOption[] = [
  { id: "ppl", name: "Push / Pull / Legs", blurb: "Group muscles by movement: pushing, pulling, legs. Every session works muscles that rested the session before.", muscles: "Chest, shoulders, triceps · Back, biceps · Legs", rotations: [
    { id: "ppl3", keys: ["push", "pull", "legs"], note: "Classic. Keep it rolling: 3 days a week hits each muscle once, 5 to 6 days hits it twice" },
    { id: "ppl6", keys: ["push", "pull", "legs", "push", "pull", "legs"], note: "Two different versions (A and B) of each session. Best for 5 to 6 days a week" },
  ] },
  { id: "upper_lower", name: "Upper / Lower", blurb: "Alternate upper-body and lower-body sessions, so each half rests while the other works.", muscles: "Upper body · Lower body", rotations: [
    { id: "ul2", keys: ["upA", "loA"], note: "Simple alternation. 4 days a week hits every muscle twice" },
    { id: "ul4", keys: ["upA", "loA", "upB", "loB"], note: "Two different upper and two different lower sessions, with more variety" },
  ] },
  { id: "full_body", name: "Full body", blurb: "Train everything every session. Great for beginners and busy weeks. Leave a rest day between sessions.", muscles: "Legs · Chest · Back · Shoulders · Arms", rotations: [
    { id: "fb2", keys: ["fbA", "fbB"], note: "Alternate two sessions. Best at 3 days a week with a rest day between", restDay: true },
    { id: "fb3", keys: ["fbA", "fbB", "fbC"], note: "Three different sessions. Best at 3 days a week with a rest day between", restDay: true },
  ] },
  { id: "bro", name: "Body-part split", blurb: "One or two muscle groups per session, with legs placed between the upper-body days so nothing is trained twice in a row.", muscles: "Chest · Back · Shoulders · Arms · Legs", rotations: [
    { id: "bro4", keys: ["chestTri", "backBi", "legs", "shoulderDay"], note: "Chest and triceps, back and biceps, legs, shoulders" },
    { id: "bro5", keys: ["chestDay", "backDay", "legs", "shoulderDay", "armDay"], note: "Five sessions, each muscle gets its own day" },
  ] },
  { id: "ppl_ul", name: "PPL + Upper / Lower", blurb: "Push, pull, legs, then an upper and a lower session.", muscles: "Push · Pull · Legs · Upper · Lower", rotations: [
    { id: "pplul5", keys: ["push", "pull", "legs", "upA", "loA"], note: "Five sessions. Hits everything about twice every 5 sessions" },
  ] },
];
export const rotationLabel = (r: Rotation) => r.keys.map((k) => SESSION_NAMES[k]).join(" → ");

/** Guess the plate colour of a workout from its name ("Push", "Upper A", "Leg day"...). */
export function toneOfName(name: string): "red" | "blue" | "yellow" | "green" | "steel" {
  const n = name.toLowerCase();
  if (/push|chest|press/.test(n)) return "red";
  if (/pull|back|row/.test(n)) return "blue";
  if (/leg|squat|quad|glute/.test(n)) return "yellow";
  if (/lower/.test(n)) return "green";
  if (/upper/.test(n)) return "red";
  return "steel";
}

/**
 * Rough length of a workout in minutes: about 35 seconds working per set plus the rest you planned,
 * three quarters of a minute to set up each exercise and five minutes to warm up.
 */
export const estimateMinutes = (exs: { sets: number; restSeconds: number }[]) =>
  Math.round((exs.reduce((a, e) => a + e.sets * (35 + e.restSeconds), 0) / 60 + exs.length * 0.75 + (exs.length ? 5 : 0)) / 5) * 5;
export const TIME_CHOICES = [30, 45, 60, 75, 90] as const;
