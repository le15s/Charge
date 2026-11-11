// Client-safe. Checks a workout (or a whole cycle) against the person's goal and says what does not fit and what to change.
// The numbers come from src/lib/goals.ts, the same ones the assistant builds with. These are guidelines, never orders.
import { EXERCISE_BY_ID, isTimed } from "./exercises";
import { PROFILES, goalOf, type GoalId, type Role } from "./goals";
import { estimateMinutes } from "./splits";
import { AREA_WORD, clashes, type Limits } from "./limits";

export type WExercise = { exerciseId: string; sets: number; repsMin: number; repsMax: number; restSeconds: number | null };
export type Finding = {
  id: string;
  /** warn = this works against the goal, tip = worth a look, good = checked and fine */
  level: "warn" | "tip" | "good";
  title: string;
  text: string;
  /** what to do about it, in a few words */
  fix?: string;
};
export type WorkoutAnalysis = { findings: Finding[]; verdict: "fits" | "mostly" | "off"; label: string; minutes: number; sets: number };

const REST_FALLBACK = 90;
const BIG_LIFT_MUSCLES = ["quadriceps", "hamstrings", "glutes", "chest", "lats", "middle back", "shoulders", "lower back"];
/** The first big multi-joint lift is the "main" lift, other big lifts "support" it, everything else (single-joint work, arm dips...) is accessory. */
const rolesOf = (exs: WExercise[]): Role[] => {
  let rank = 0;
  return exs.map((e) => {
    const x = EXERCISE_BY_ID[e.exerciseId];
    if (!x || x.mechanic !== "compound" || !x.primaryMuscles.some((m) => BIG_LIFT_MUSCLES.includes(m))) return "accessory";
    return rank++ === 0 ? "main" : "support";
  });
};
const nameOf = (id: string) => EXERCISE_BY_ID[id]?.name ?? id;
const list = (xs: string[], n = 3) => (xs.length <= n ? xs.join(", ") : `${xs.slice(0, n).join(", ")} and ${xs.length - n} more`);
const BIG_MUSCLES = ["quadriceps", "hamstrings", "glutes", "chest", "lats", "middle back", "shoulders"];

export function analyzeWorkout(input: { goal: string | null | undefined; level?: string | null; exercises: WExercise[]; name?: string; limits?: Limits | null }): WorkoutAnalysis {
  const goal: GoalId = goalOf(input.goal);
  const P = PROFILES[goal];
  const exs = input.exercises.filter((e) => EXERCISE_BY_ID[e.exerciseId] && e.sets > 0);
  const out: Finding[] = [];
  const minutes = estimateMinutes(exs.map((e) => ({ sets: e.sets, restSeconds: e.restSeconds ?? REST_FALLBACK })));
  const totalSets = exs.reduce((a, e) => a + e.sets, 0);
  if (!exs.length) return { findings: [], verdict: "fits", label: "Add exercises to see how it fits", minutes: 0, sets: 0 };
  const roles = rolesOf(exs);
  const repExs = exs.map((e, i) => ({ e, role: roles[i] })).filter(({ e }) => !isTimed(e.exerciseId));

  /* 1. reps */
  let low = 0, high = 0, counted = 0; const lowNames: string[] = [], highNames: string[] = [];
  for (const { e, role } of repExs) {
    const [lo, hi] = P.okReps[role]; const mid = (e.repsMin + e.repsMax) / 2;
    counted += e.sets;
    if (mid > hi) { high += e.sets; highNames.push(`${nameOf(e.exerciseId)} (${e.repsMin === e.repsMax ? e.repsMin : `${e.repsMin}-${e.repsMax}`})`); }
    else if (mid < lo) { low += e.sets; lowNames.push(`${nameOf(e.exerciseId)} (${e.repsMin === e.repsMax ? e.repsMin : `${e.repsMin}-${e.repsMax}`})`); }
  }
  const mainBand = P.okReps.main, accBand = P.okReps.accessory;
  const sayRange = `${P.okReps.main[0]}-${P.okReps.main[1]} reps on the big lifts and ${P.okReps.accessory[0]}-${P.okReps.accessory[1]} on the rest`;
  if (counted) {
    const hShare = high / counted, lShare = low / counted;
    if (hShare >= 0.5) {
      out.push({ id: "reps-high", level: "warn", title: "Too many reps for your goal",
        text: goal === "muscle" || goal === "recomp" || goal === "lose"
          ? `Most of your sets are high-rep (${list(highNames)}). Very high reps can still grow muscle, but sets get limited by breathing and burning long before the muscle is challenged, so it takes more time for less. ${goal === "lose" ? "When you are in a deficit, heavier sets also tell your body to keep its muscle." : ""}`.trim()
          : goal === "strength"
            ? `Most of your sets are high-rep (${list(highNames)}). Strength comes from heavy loads: sets of many reps train endurance more than maximum strength.`
            : `Most of your sets are above the usual range for this goal (${list(highNames)}).`,
        fix: `Use a heavier weight and aim for ${sayRange}.` });
    } else if (hShare >= 0.2) {
      out.push({ id: "reps-high-some", level: "tip", title: "Some sets are very high-rep", text: `${list(highNames)} ${highNames.length === 1 ? "is" : "are"} above the usual range for ${P.focus}.`, fix: `Try ${mainBand[1]} reps or fewer on the big lifts.` });
    }
    if (lShare >= 0.5) {
      out.push({ id: "reps-low", level: "warn", title: goal === "endurance" ? "Too heavy for building endurance" : "Reps are very low for your goal",
        text: goal === "endurance"
          ? `Most sets are heavy and low-rep (${list(lowNames)}). That trains maximum strength, not the ability to keep going. Endurance work uses lighter weights and 12 to 25 reps.`
          : `Most sets are very low-rep (${list(lowNames)}). That is a strength-style workout. It is not wrong, but for ${P.focus} you usually get more from ${sayRange}.`,
        fix: goal === "endurance" ? "Lower the weight and do 12-25 reps with shorter rests." : `Lower the weight a little and do ${mainBand[0]}+ reps.` });
    } else if (lShare >= 0.2) {
      out.push({ id: "reps-low-some", level: "tip", title: "Some sets are lower-rep than usual", text: `${list(lowNames)} ${lowNames.length === 1 ? "is" : "are"} below the usual range for ${P.focus}.`, fix: `Try ${mainBand[0]} or more reps.` });
    }
    if (hShare < 0.2 && lShare < 0.2 && accBand) out.push({ id: "reps-ok", level: "good", title: "Rep ranges fit your goal", text: `Your sets are in the range that suits ${P.focus}.` });
  }

  if (goal === "strength" && repExs.length >= 2 && repExs.every(({ e }) => e.repsMin > 6) && !out.some((f) => f.id === "reps-high")) {
    out.push({ id: "no-heavy", level: "warn", title: "No heavy sets", text: "Every set is above 6 reps. Strength is built by lifting heavy loads for low reps (about 3 to 6) on the big lifts, so your top lift needs at least a few sets there.", fix: "Make your first lift 3-6 reps with a heavier weight and 2-3 minute rests." });
  }

  /* 2. rest */
  let restLong = 0, restShort = 0, restCounted = 0; const longNames: string[] = [], shortNames: string[] = [];
  exs.forEach((e, i) => {
    if (e.restSeconds == null) return;
    const [lo, hi] = P.okRest[roles[i]]; restCounted += e.sets;
    if (e.restSeconds > hi) { restLong += e.sets; longNames.push(`${nameOf(e.exerciseId)} (${e.restSeconds}s)`); }
    else if (e.restSeconds < lo) { restShort += e.sets; shortNames.push(`${nameOf(e.exerciseId)} (${e.restSeconds}s)`); }
  });
  if (restCounted) {
    const lg = restLong / restCounted, sh = restShort / restCounted;
    if (lg >= 0.4) out.push({ id: "rest-long", level: goal === "endurance" || goal === "lose" ? "warn" : "tip", title: "Rests are longer than needed",
      text: goal === "endurance" ? `Long rests (${list(longNames)}) let your heart rate and breathing settle fully, which is the opposite of what endurance training asks of you.`
        : goal === "lose" ? `Long rests (${list(longNames)}) make the session drag on. Shorter rests keep the pace up and save time.`
        : `Rests like ${list(longNames)} are longer than this goal needs and stretch the session.`,
      fix: `Rest ${P.okRest.main[1] >= 180 ? "about 1.5 to 3 minutes on the big lifts and 1 to 2 minutes on the rest" : "under about 1.5 minutes"}.` });
    if (sh >= 0.4) out.push({ id: "rest-short", level: goal === "strength" ? "warn" : "tip", title: "Rests are short for this goal",
      text: goal === "strength" ? `Short rests (${list(shortNames)}) leave you tired for the next set, so you lift less weight than you could. Strength needs full recovery between heavy sets: 2 to 3 minutes or more on the big lifts.`
        : `Short rests (${list(shortNames)}) cut your reps on the next set. For ${P.focus}, 1 to 2 minutes on the big lifts usually works better.`,
      fix: goal === "strength" ? "Rest 2-3 minutes between heavy sets." : "Rest 1-2 minutes on compound lifts." });
    if (lg < 0.4 && sh < 0.4) out.push({ id: "rest-ok", level: "good", title: "Rest times fit your goal", text: "Your rest times suit this goal." });
  }

  /* 3. length and size of the session */
  const lvl = input.level === "advanced" || input.level === "expert" ? "advanced" : input.level === "intermediate" ? "intermediate" : "beginner";
  const maxSets = lvl === "advanced" ? 32 : lvl === "intermediate" ? 26 : 20;
  if (minutes > P.maxMinutes + 15) out.push({ id: "long", level: "warn", title: "This workout is long",
    text: `It would take about ${minutes} minutes. Past about ${P.maxMinutes} minutes most people slow down and cut corners, and long sessions are harder to fit into a week and to recover from.`,
    fix: "Split it into two sessions, drop the last exercises or trim sets." });
  else if (minutes > P.maxMinutes) out.push({ id: "long-ish", level: "tip", title: "On the long side", text: `About ${minutes} minutes. A little shorter would be easier to keep up.` });
  if (totalSets > maxSets) out.push({ id: "many-sets", level: "warn", title: "A lot of sets for one session",
    text: `${totalSets} sets is a lot for ${lvl === "advanced" ? "an experienced" : lvl === "intermediate" ? "an intermediate" : "a beginner"} lifter. More sets past the point you can train hard mostly add tiredness, not results.`, fix: `Aim for about ${Math.round(maxSets * 0.7)}-${maxSets} sets.` });
  if (exs.length >= 4 && totalSets < 8) out.push({ id: "few-sets", level: "tip", title: "Very few sets", text: `${totalSets} sets across ${exs.length} exercises is light. One or two more sets on the big lifts would help.` });
  if (exs.length < 3) out.push({ id: "few-ex", level: "tip", title: "Only a couple of exercises", text: "That works as a short session, but it will hit only a few muscles." });

  /* 4. one muscle, too many sets */
  const perMuscle: Record<string, number> = {};
  for (const e of exs) for (const m of EXERCISE_BY_ID[e.exerciseId].primaryMuscles) perMuscle[m] = (perMuscle[m] ?? 0) + e.sets;
  const heavy = Object.entries(perMuscle).filter(([, n]) => n > 14).map(([m, n]) => `${m} (${n})`);
  if (heavy.length) out.push({ id: "one-muscle", level: "tip", title: "Lots of sets on one muscle", text: `More than about 14 hard sets for one muscle in a single session (${heavy.join(", ")}) gives you less and less back. Spreading them over two days works better.`, fix: "Move some sets to another workout." });

  /* 5. what is in it */
  const compounds = exs.filter((e) => EXERCISE_BY_ID[e.exerciseId].mechanic === "compound").length;
  // a day built around one or two muscles (arms, shoulders...) is meant to be mostly single-joint work
  const focused = new Set(exs.flatMap((e) => EXERCISE_BY_ID[e.exerciseId].primaryMuscles).filter((m) => m !== "abdominals")).size <= 3;
  if (exs.length >= 4 && compounds < 2 && goal !== "endurance" && !focused) out.push({ id: "few-compound", level: "tip", title: "Mostly single-joint exercises", text: "Big multi-joint lifts (squats, presses, rows) build the most in the least time. This workout has hardly any.", fix: "Start with one or two compound lifts." });
  const firstCompound = exs.findIndex((e) => EXERCISE_BY_ID[e.exerciseId].mechanic === "compound");
  if (firstCompound > 1 && !focused && (goal === "strength" || goal === "muscle" || goal === "recomp")) out.push({ id: "order", level: "tip", title: "Heavy lifts should come first", text: `Your first big lift comes after ${firstCompound} small exercises. You will be tired when it counts.`, fix: "Move the compound lifts to the top." });
  if (goal === "strength" && exs.length && exs[0] && EXERCISE_BY_ID[exs[0].exerciseId].mechanic === "compound" && exs[0].sets < 3) out.push({ id: "main-sets", level: "tip", title: "Give your main lift more sets", text: `${nameOf(exs[0].exerciseId)} has ${exs[0].sets} set${exs[0].sets === 1 ? "" : "s"}. Strength needs practice with heavy loads: 3 to 5 sets usually.` });
  const hard = exs.filter((e) => EXERCISE_BY_ID[e.exerciseId].level === "expert").map((e) => nameOf(e.exerciseId));
  if (lvl !== "advanced" && hard.length) out.push({ id: "level", level: "tip", title: "Some exercises are for experienced lifters", text: `${list(hard)} ${hard.length === 1 ? "is" : "are"} rated expert. Check you can do ${hard.length === 1 ? "it" : "them"} with good form first.` });
  const sets7 = exs.some((e) => e.sets > 6);
  if (sets7) out.push({ id: "sets-per-ex", level: "tip", title: "More than 6 sets on one exercise", text: "After about 5 or 6 sets of the same exercise your form and effort drop. Add a different exercise for the same muscle instead." });

  /* injuries and pain: an exercise that loads an area the person marked */
  const bad: string[] = [], careful: string[] = [], areas = new Set<string>();
  for (const e of exs) {
    const c = clashes(nameOf(e.exerciseId), input.limits);
    if (!c.length) continue;
    const worst = c[0];
    for (const x of c) areas.add(AREA_WORD[x.area]);
    (c.some((x) => x.severity === "avoid") ? bad : careful).push(`${nameOf(e.exerciseId)} (${AREA_WORD[worst.area]})`);
  }
  if (bad.length) out.push({ id: "limit-avoid", level: "warn", title: `${list(bad)} loads something you marked "avoid"`, text: `You told us to avoid exercises that load your ${list([...areas], 4)}. ${bad.length === 1 ? "This one does" : "These do"}.`, fix: "Swap it for another exercise (the assistant leaves these out automatically)" });
  if (careful.length) out.push({ id: "limit-careful", level: "tip", title: `${list(careful)} is hard on an area you marked "be careful"`, text: "These are among the harder exercises for that area. Go light, stop if it hurts, or swap it.", fix: "Lighter weight or a gentler exercise" });
  const limitOnly = bad.length > 0 && out.filter((f) => f.level === "warn").every((f) => f.id === "limit-avoid");

  const warns = out.filter((f) => f.level === "warn").length, tips = out.filter((f) => f.level === "tip").length;
  const verdict: WorkoutAnalysis["verdict"] = warns ? "off" : tips >= 2 ? "mostly" : tips === 1 ? "mostly" : "fits";
  if (!warns && !tips && !out.some((f) => f.level === "good")) out.push({ id: "fine", level: "good", title: "Fits your goal", text: "Nothing here works against your goal." });
  const label = limitOnly ? "Includes exercises you marked to avoid" : verdict === "fits" ? "Fits your goal" : verdict === "mostly" ? "Mostly fits your goal" : "Doesn't fit your goal yet";
  out.sort((a, b) => ({ warn: 0, tip: 1, good: 2 }[a.level] - { warn: 0, tip: 1, good: 2 }[b.level]));
  return { findings: out, verdict, label, minutes, sets: totalSets };
}

/** The same check over a whole rotation, plus the things only visible from above: a muscle that is never trained, pushing against pulling. */
export function analyzeCycle(input: { goal: string | null | undefined; level?: string | null; limits?: Limits | null; workouts: { name: string; exercises: WExercise[] }[] }) {
  const goal = goalOf(input.goal);
  const per = input.workouts.map((w) => ({ name: w.name, ...analyzeWorkout({ goal, level: input.level, limits: input.limits, exercises: w.exercises, name: w.name }) }));
  const cycle: Finding[] = [];
  const all = input.workouts.flatMap((w) => w.exercises).filter((e) => EXERCISE_BY_ID[e.exerciseId]);
  if (all.length >= 4 && input.workouts.length >= 2) {
    const sets: Record<string, number> = {};
    // helper muscles count for half: a bench press does train the front of the shoulder
    for (const e of all) { const x = EXERCISE_BY_ID[e.exerciseId]; for (const m of x.primaryMuscles) sets[m] = (sets[m] ?? 0) + e.sets; for (const m of x.secondaryMuscles ?? []) sets[m] = (sets[m] ?? 0) + e.sets / 2; }
    const legs = (sets.quadriceps ?? 0) + (sets.hamstrings ?? 0) + (sets.glutes ?? 0);
    const missing = BIG_MUSCLES.filter((m) => (sets[m] ?? 0) === 0 && !(m === "middle back" && (sets.lats ?? 0) > 0) && !(m === "lats" && (sets["middle back"] ?? 0) > 0));
    if (legs === 0) cycle.push({ id: "no-legs", level: "tip", title: "No leg training in this cycle", text: "Legs are the biggest muscles in the body and train well alongside the rest. Without them your lower body will fall behind.", fix: "Add a legs workout." });
    const rest = missing.filter((m) => !["quadriceps", "hamstrings", "glutes"].includes(m));
    if (rest.length) cycle.push({ id: "missing", level: "tip", title: "Some muscles are never trained", text: `Nothing in this cycle trains your ${list(rest.map((m) => (m === "lats" ? "back" : m)), 4)}.`, fix: "Add an exercise for each." });
    let push = 0, pull = 0;
    const UPPER = ["chest", "shoulders", "triceps", "lats", "middle back", "biceps", "traps"];
    for (const e of all) { const x = EXERCISE_BY_ID[e.exerciseId]; if (!x.primaryMuscles.some((m) => UPPER.includes(m))) continue; if (x.force === "push") push += e.sets; else if (x.force === "pull") pull += e.sets; }
    if (push + pull >= 12 && push > pull * 1.8) cycle.push({ id: "push-pull", level: "tip", title: "Much more pushing than pulling", text: `${push} pushing sets against ${pull} pulling sets. Many coaches suggest at least as much pulling as pushing to keep your shoulders happy.`, fix: "Add rows or pulldowns." });
    if (push + pull >= 12 && pull > push * 1.8) cycle.push({ id: "pull-push", level: "tip", title: "Much more pulling than pushing", text: `${pull} pulling sets against ${push} pushing sets. A little more pressing would balance it.` });
  }
  const worst = per.some((p) => p.verdict === "off") ? "off" : per.some((p) => p.verdict === "mostly") || cycle.length ? "mostly" : "fits";
  return { workouts: per, cycle, verdict: worst as WorkoutAnalysis["verdict"] };
}
