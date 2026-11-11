// Server/client-safe maths for "does this cycle let a muscle rest?". It works from the exercises in a workout, so it also
// covers workouts people build themselves, not only the ones the assistant writes.
import { EXERCISE_BY_ID } from "./exercises";

export type Group = "chest" | "back" | "shoulders" | "biceps" | "triceps" | "quads" | "hamstrings" | "glutes" | "lower back" | "calves" | "abs" | "forearms";
export const GROUPS: Group[] = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "lower back", "calves", "abs", "forearms"];
export const GROUP_LABEL: Record<Group, string> = { chest: "Chest", back: "Back", shoulders: "Shoulders", biceps: "Biceps", triceps: "Triceps", quads: "Quads", hamstrings: "Hamstrings", glutes: "Glutes", "lower back": "Lower back", calves: "Calves", abs: "Abs", forearms: "Forearms" };

const GROUP_OF: Record<string, Group | undefined> = {
  chest: "chest", lats: "back", "middle back": "back", traps: "back", shoulders: "shoulders", biceps: "biceps", triceps: "triceps",
  quadriceps: "quads", hamstrings: "hamstrings", glutes: "glutes", "lower back": "lower back", calves: "calves", abdominals: "abs", forearms: "forearms",
};

/** Hours a muscle group needs before it should be trained hard again. Big muscles ~48 h, arms and delts a bit less, small fast-recovering ones about a day. */
export const RECOVER_HOURS: Record<Group, number> = { chest: 48, back: 48, shoulders: 48, biceps: 36, triceps: 36, quads: 48, hamstrings: 48, glutes: 48, "lower back": 48, calves: 24, abs: 24, forearms: 24 };
/** Weighted sets (main muscle = 1, helper = 0.2) a session needs on a group before it counts as "trained". */
export const COUNTS_AT: Record<Group, number> = { chest: 3.5, back: 5, shoulders: 3.5, biceps: 3.5, triceps: 3.5, quads: 3.5, hamstrings: 3, glutes: 3.5, "lower back": 3, calves: 99, abs: 99, forearms: 99 };
// calves, abs and forearms recover fast and are trained a little almost every day, so they never block a session (99 = never reached by accident)
const FAST: Group[] = ["calves", "abs", "forearms"];

export type Load = Partial<Record<Group, number>>;

/** Helpers (the library's "secondary" muscles) count for less than the muscle the move is built for. */
const HELPER = 0.2;
const REAR_DELT = /face pull|reverse (machine )?fl|rear delt|back flyes|bent.?over.*(lateral|raise)|rear lateral/i;
const PULLERS = ["lats", "middle back", "traps"];

export function loadOf(items: { exerciseId: string; sets: number }[]): Load {
  const out: Load = {};
  const add = (g: Group | undefined, v: number) => { if (g) out[g] = (out[g] ?? 0) + v; };
  for (const it of items) {
    const e = EXERCISE_BY_ID[it.exerciseId]; if (!e) continue;
    const rear = REAR_DELT.test(e.name); // rear delts are trained with the back, not with the pressing muscles
    const pull = e.primaryMuscles.some((m) => PULLERS.includes(m));
    for (const m of e.primaryMuscles) add(rear && m === "shoulders" ? "back" : GROUP_OF[m], it.sets);
    for (const m of e.secondaryMuscles) {
      if (e.primaryMuscles.includes(m)) continue;
      if (m === "shoulders" && (rear || pull)) continue; // pulling doesn't tax the muscles that press
      add(GROUP_OF[m], it.sets * HELPER);
    }
  }
  for (const g of GROUPS) if (out[g] != null) out[g] = Math.round(out[g]! * 10) / 10;
  return out;
}
/** Muscle groups a session trains hard enough for rest to matter. */
export const hardGroups = (l: Load): Group[] => GROUPS.filter((g) => !FAST.includes(g) && (l[g] ?? 0) >= COUNTS_AT[g]);

export type Clash = { from: string; to: string; groups: Group[] };
/** Pairs of back-to-back sessions (including last → first when the cycle rolls over) that train the same muscle hard. */
export function cycleClashes(sessions: { name: string; load: Load }[]): Clash[] {
  const n = sessions.length; if (n < 2) return [];
  const out: Clash[] = [];
  for (let i = 0; i < n; i++) {
    const a = sessions[i], b = sessions[(i + 1) % n];
    if (n === 2 && i === 1) break; // two sessions: a→b and b→a are the same pair
    const shared = hardGroups(a.load).filter((g) => hardGroups(b.load).includes(g));
    if (shared.length) out.push({ from: a.name, to: b.name, groups: shared });
  }
  return out;
}

/** After finishing sessions, how many hours until each group has recovered. `last` = ms timestamp a group was last trained hard. */
export function recoveryLeft(last: Partial<Record<Group, number>>, load: Load, now = Date.now()): { group: Group; hours: number }[] {
  return hardGroups(load).flatMap((g) => {
    const t = last[g]; if (t == null) return [];
    const left = RECOVER_HOURS[g] - (now - t) / 3_600_000;
    return left > 1 ? [{ group: g, hours: Math.ceil(left) }] : [];
  }).sort((a, b) => b.hours - a.hours);
}
export const fmtHours = (h: number) => (h >= 36 ? `${Math.round(h / 24)} days` : `${h} h`);
const lc = (g: Group) => GROUP_LABEL[g].toLowerCase();
export const groupList = (gs: Group[]) => gs.map(lc).join(", ").replace(/, ([^,]*)$/, " and $1");
