// Client-safe. Training experience is a length of time, and the level follows from it, so it keeps rising by itself.
export type Level = "beginner" | "intermediate" | "advanced" | "expert";

/** How long someone has trained, as the options they pick from. `months` is a middle-of-the-range guess used to start the clock. */
export const TRAINING_TIME = [
  { id: "new", title: "I'm just starting", text: "Never trained, or less than a month.", months: 0 },
  { id: "lt6", title: "Under 6 months", text: "Still learning the basic movements.", months: 3 },
  { id: "6to24", title: "6 months to 2 years", text: "Comfortable with the main lifts.", months: 12 },
  { id: "2to5", title: "2 to 5 years", text: "Consistent training, progress is slower now.", months: 36 },
  { id: "5plus", title: "More than 5 years", text: "A long training history.", months: 72 },
] as const;
export type TrainingTimeId = (typeof TRAINING_TIME)[number]["id"];
export const TRAINING_IDS = TRAINING_TIME.map((t) => t.id) as [TrainingTimeId, ...TrainingTimeId[]];

/** Months of training needed for each level. */
export const LEVELS: { id: Level; title: string; minMonths: number; text: string }[] = [
  { id: "beginner", title: "Beginner", minMonths: 0, text: "Under 6 months. Simple lifts, steady progress." },
  { id: "intermediate", title: "Intermediate", minMonths: 6, text: "6 months to 2 years. More volume, more variety." },
  { id: "advanced", title: "Advanced", minMonths: 24, text: "2 to 5 years. Harder exercises and bigger sessions." },
  { id: "expert", title: "Expert", minMonths: 60, text: "5 years or more. Everything in the library is open to you." },
];
export const levelTitle = (l: string | null | undefined) => LEVELS.find((x) => x.id === l)?.title ?? "Beginner";

const MONTH = 30.44 * 86_400_000;
export const monthsTrained = (since: number | null | undefined, now = Date.now()) => (since == null ? 0 : Math.max(0, (now - since) / MONTH));
export function levelFor(since: number | null | undefined, now = Date.now()): Level {
  const m = monthsTrained(since, now);
  return [...LEVELS].reverse().find((l) => m >= l.minMonths)!.id;
}
/** When someone says "6 months to 2 years", start the clock a typical amount of time ago. */
export const sinceFor = (id: TrainingTimeId, now = Date.now()) => Math.round(now - (TRAINING_TIME.find((t) => t.id === id)?.months ?? 0) * MONTH);
/** The next level and roughly how many months away it is (null at the top). */
export function nextLevel(since: number | null | undefined, now = Date.now()) {
  const m = monthsTrained(since, now);
  const nxt = LEVELS.find((l) => l.minMonths > m);
  return nxt ? { level: nxt, months: Math.max(1, Math.ceil(nxt.minMonths - m)) } : null;
}
/** The exercise engine works with three tiers; expert uses the advanced one. */
export const engineLevel = (l: string | null | undefined): "beginner" | "intermediate" | "advanced" => (l === "expert" || l === "advanced" ? "advanced" : l === "intermediate" ? "intermediate" : "beginner");
export const LEVEL_IDS = ["beginner", "intermediate", "advanced", "expert"] as const;
