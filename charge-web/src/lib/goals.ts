// Client-safe. One place that says what a good workout and a good day of eating look like for each goal.
// The assistant builds workouts from these numbers and the analysis checks workouts against the same numbers, so they always agree.
//
// Where the numbers come from (general guidelines for healthy adults, not medical advice):
//  - ACSM position stand "Progression models in resistance training for healthy adults" (2009): strength = heavy loads (about 1-6 reps) with
//    2-3 minute rests on the big lifts; muscle size = about 1-12 reps with most work at 6-12 and 1-2 minute rests; local muscular endurance =
//    light loads, about 15+ reps, with short rests (under about 1.5 minutes).
//  - Schoenfeld, Ogborn & Krieger (2017), meta-analysis: 10 or more hard sets per muscle per week built more muscle than fewer than 10.
//  - Schoenfeld et al. (2017), meta-analysis of low-load and high-load training: muscle grew in a similar way across a wide range of loads when sets
//    were taken close to failure, so a high-rep set is not useless for size. The middle range is the most time-efficient, so the bands below mean
//    "efficient", not "the only thing that works".
//  - Bickel et al. (2011): about a third of the usual volume was enough to hold on to muscle in trained adults, so "stay in shape" needs less.
// Everything here is a rule of thumb: bodies and schedules differ.

export type GoalId = "muscle" | "lose" | "recomp" | "strength" | "maintain" | "endurance";
export const GOAL_IDS: GoalId[] = ["muscle", "lose", "recomp", "strength", "maintain", "endurance"];
export const isGoal = (g: string | null | undefined): g is GoalId => !!g && (GOAL_IDS as string[]).includes(g);
/** Anything unknown is treated like "muscle", which is what the assistant has always used for a missing goal. */
export const goalOf = (g: string | null | undefined): GoalId => (isGoal(g) ? g : "muscle");

export type Band = [number, number];
/** Role of an exercise in a session: the first big lift, other big lifts, and single-joint (accessory) work. */
export type Role = "main" | "support" | "accessory";
export type Variant = { lo: number; hi: number; rest: number };

export type GoalProfile = {
  id: GoalId;
  title: string;
  /** the goal as it reads in a sentence: "for building muscle" */
  focus: string;
  /** one line for the person */
  summary: string;
  /** what the assistant aims for, by role. The assistant picks one of the variants so two plans are never identical */
  ideal: Record<Role, { sets: number; variants: Variant[] }>;
  /** what the analysis accepts without a warning (reps and rest seconds), by role. "main" also covers the second lift for strength */
  okReps: Record<Role, Band>;
  okRest: Record<Role, Band>;
  /** a sensible session length in minutes (beyond the top it gets a warning) and hard sets per muscle per week */
  maxMinutes: number;
  weeklySets: Band;
  /** the number of exercises changes a little with the goal */
  sizeDelta: number;
};

export const PROFILES: Record<GoalId, GoalProfile> = {
  muscle: {
    id: "muscle", title: "Build muscle", focus: "building muscle", summary: "Moderate loads (about 6 to 15 reps), a good number of sets, rests of 1 to 2 minutes.",
    ideal: {
      main: { sets: 4, variants: [{ lo: 6, hi: 10, rest: 120 }, { lo: 6, hi: 8, rest: 150 }, { lo: 8, hi: 12, rest: 120 }] },
      support: { sets: 3, variants: [{ lo: 8, hi: 12, rest: 90 }, { lo: 8, hi: 10, rest: 90 }, { lo: 10, hi: 12, rest: 75 }] },
      accessory: { sets: 3, variants: [{ lo: 10, hi: 15, rest: 60 }, { lo: 12, hi: 15, rest: 60 }, { lo: 8, hi: 12, rest: 75 }, { lo: 12, hi: 20, rest: 45 }] },
    },
    okReps: { main: [4, 15], support: [6, 20], accessory: [6, 25] }, okRest: { main: [60, 240], support: [45, 180], accessory: [30, 150] },
    maxMinutes: 90, weeklySets: [10, 20], sizeDelta: 0,
  },
  strength: {
    id: "strength", title: "Get stronger", focus: "getting stronger", summary: "Heavy main lifts (about 3 to 6 reps) with long rests, then moderate work to support them.",
    ideal: {
      main: { sets: 4, variants: [{ lo: 3, hi: 5, rest: 180 }, { lo: 2, hi: 4, rest: 210 }, { lo: 4, hi: 6, rest: 180 }] },
      support: { sets: 3, variants: [{ lo: 5, hi: 8, rest: 150 }, { lo: 6, hi: 8, rest: 120 }, { lo: 5, hi: 7, rest: 150 }] },
      accessory: { sets: 3, variants: [{ lo: 8, hi: 12, rest: 90 }, { lo: 8, hi: 10, rest: 90 }, { lo: 10, hi: 12, rest: 75 }] },
    },
    okReps: { main: [1, 8], support: [3, 12], accessory: [5, 20] }, okRest: { main: [120, 360], support: [90, 240], accessory: [45, 180] },
    maxMinutes: 100, weeklySets: [8, 16], sizeDelta: -1,
  },
  lose: {
    id: "lose", title: "Lose fat", focus: "losing fat", summary: "Keep lifting properly so you keep your muscle (6 to 12 reps on the big lifts), a bit more reps and shorter rests on the rest.",
    ideal: {
      main: { sets: 3, variants: [{ lo: 6, hi: 10, rest: 90 }, { lo: 8, hi: 10, rest: 90 }, { lo: 8, hi: 12, rest: 90 }] },
      support: { sets: 3, variants: [{ lo: 8, hi: 12, rest: 75 }, { lo: 10, hi: 12, rest: 60 }] },
      accessory: { sets: 3, variants: [{ lo: 12, hi: 15, rest: 45 }, { lo: 10, hi: 15, rest: 45 }, { lo: 12, hi: 20, rest: 40 }] },
    },
    okReps: { main: [4, 15], support: [6, 20], accessory: [8, 25] }, okRest: { main: [45, 180], support: [30, 150], accessory: [20, 120] },
    maxMinutes: 75, weeklySets: [8, 16], sizeDelta: 0,
  },
  recomp: {
    id: "recomp", title: "Recomposition", focus: "recomposition", summary: "Muscle-building style training with a little less volume, since you are not eating in a surplus.",
    ideal: {
      main: { sets: 3, variants: [{ lo: 6, hi: 10, rest: 120 }, { lo: 5, hi: 8, rest: 120 }, { lo: 8, hi: 10, rest: 105 }] },
      support: { sets: 3, variants: [{ lo: 8, hi: 12, rest: 90 }, { lo: 8, hi: 10, rest: 75 }] },
      accessory: { sets: 3, variants: [{ lo: 10, hi: 15, rest: 60 }, { lo: 12, hi: 15, rest: 50 }, { lo: 10, hi: 12, rest: 60 }] },
    },
    okReps: { main: [4, 15], support: [6, 20], accessory: [6, 25] }, okRest: { main: [60, 210], support: [45, 180], accessory: [30, 120] },
    maxMinutes: 80, weeklySets: [8, 16], sizeDelta: 0,
  },
  maintain: {
    id: "maintain", title: "Stay in shape", focus: "staying in shape", summary: "Fewer sets are enough to hold what you have: 6 to 12 reps on the main lifts, short and steady sessions.",
    ideal: {
      main: { sets: 3, variants: [{ lo: 6, hi: 10, rest: 90 }, { lo: 8, hi: 10, rest: 90 }, { lo: 6, hi: 8, rest: 105 }] },
      support: { sets: 3, variants: [{ lo: 8, hi: 12, rest: 75 }, { lo: 8, hi: 10, rest: 75 }] },
      accessory: { sets: 2, variants: [{ lo: 10, hi: 15, rest: 60 }, { lo: 12, hi: 15, rest: 45 }, { lo: 10, hi: 12, rest: 60 }] },
    },
    okReps: { main: [4, 15], support: [5, 20], accessory: [6, 25] }, okRest: { main: [45, 210], support: [30, 180], accessory: [20, 120] },
    maxMinutes: 70, weeklySets: [6, 12], sizeDelta: -1,
  },
  endurance: {
    id: "endurance", title: "Build endurance", focus: "building endurance", summary: "Lighter loads, more reps (about 12 to 25) and short rests, so your muscles can keep working for longer.",
    ideal: {
      main: { sets: 3, variants: [{ lo: 12, hi: 15, rest: 60 }, { lo: 12, hi: 20, rest: 45 }, { lo: 15, hi: 20, rest: 45 }] },
      support: { sets: 3, variants: [{ lo: 15, hi: 20, rest: 45 }, { lo: 12, hi: 18, rest: 45 }, { lo: 15, hi: 25, rest: 40 }] },
      accessory: { sets: 3, variants: [{ lo: 15, hi: 25, rest: 30 }, { lo: 20, hi: 25, rest: 30 }, { lo: 15, hi: 20, rest: 40 }] },
    },
    okReps: { main: [10, 30], support: [12, 35], accessory: [12, 40] }, okRest: { main: [20, 105], support: [15, 90], accessory: [10, 75] },
    maxMinutes: 75, weeklySets: [8, 18], sizeDelta: 1,
  },
};

export const profileOf = (g: string | null | undefined) => PROFILES[goalOf(g)];

/* ---------- Eating ---------- */
export type FoodProfile = {
  /** daily calories compared to maintenance */
  calories: { adj: number; why: string };
  /** grams of protein per kilo of body weight: a target and the range that needs no comment */
  protein: { target: number; low: number; high: number };
  /** carbohydrate floor in grams per kilo (when there is a lot of training) */
  carbsFloor: number;
};
export const FOOD_PROFILES: Record<GoalId, FoodProfile> = {
  muscle: { calories: { adj: 0.1, why: "a small surplus gives your muscles the energy to grow" }, protein: { target: 1.9, low: 1.6, high: 2.6 }, carbsFloor: 3 },
  strength: { calories: { adj: 0.05, why: "a little extra energy supports heavy training" }, protein: { target: 1.8, low: 1.6, high: 2.6 }, carbsFloor: 3 },
  lose: { calories: { adj: -0.2, why: "a moderate deficit loses fat without costing muscle" }, protein: { target: 2.2, low: 1.8, high: 3.0 }, carbsFloor: 2 },
  recomp: { calories: { adj: -0.05, why: "close to maintenance, slightly under" }, protein: { target: 2.1, low: 1.8, high: 2.8 }, carbsFloor: 2.5 },
  maintain: { calories: { adj: 0, why: "eating what you burn keeps your weight steady" }, protein: { target: 1.6, low: 1.2, high: 2.4 }, carbsFloor: 2.5 },
  endurance: { calories: { adj: 0.03, why: "long and frequent sessions burn a lot, so eat enough to fuel them" }, protein: { target: 1.5, low: 1.2, high: 2.2 }, carbsFloor: 4 },
};
