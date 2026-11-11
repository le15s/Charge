// Client-safe. Looks at what someone ate (one day, or the last week) and says whether it fits their goal, with what to change.
// Numbers come from src/lib/goals.ts (FOOD_PROFILES) and the targets from src/lib/nutrition.ts. Guidelines for healthy adults, not medical advice.
//
// Sources behind the thresholds:
//  - Protein for people who train: about 1.4 to 2.0 g per kg a day; more than ~1.6 g/kg adds little extra muscle (Morton et al. 2018, meta-analysis);
//    in a calorie deficit a higher intake (about 2.0 to 2.4 g/kg) helps keep muscle (Helms et al. 2014 review).
//  - Rate of weight change: losing about 0.5 to 1% of body weight a week is the usual advice for keeping muscle while losing fat (Helms et al. 2014);
//    gaining slowly (a few tenths of a percent a week) keeps most of the gain as muscle (Iraki et al. 2019 review).
//  - Spreading protein over 3 to 4 meals of roughly 20 to 40 g each (Schoenfeld & Aragon 2018).
//  - Fat: below about 20% of calories makes it hard to get fat-soluble vitamins and enough essential fats (general dietary guidance, 20-35%).
import { ING_BY_ID, nameOf } from "./food-index";
import { FOOD_PROFILES, goalOf, type GoalId } from "./goals";
import type { Finding } from "./analyze-workout";

export type FoodEntryLite = { meal: string; name: string; kcal: number; protein: number; carbs: number; fat: number };
export type Targets = { kcal: number; protein: number; carbs: number; fat: number };
export type FoodAnalysis = { findings: Finding[]; verdict: "fits" | "mostly" | "off"; headline: string; empty: boolean };

const r0 = (n: number) => Math.round(n);
const SWEET_FRIED = /\b(soda|cola|fanta|sprite|candy|sweets?|chocolate|cake|cookies?|biscuits?|donuts?|doughnuts?|ice cream|chips|crisps|fries|fried|pizza|burger|nuggets?|pastry|croissant|waffle|milkshake|syrup|brownie|muffin)\b/i;
const FRUIT_VEG = /\b(apple|banana|berr(y|ies)|orange|grapes?|pear|peach|plum|kiwi|mango|melon|pineapple|broccoli|spinach|salad|carrots?|tomato(es)?|lettuce|cucumber|peppers?|vegetables?|veggies?|fruit|zucchini|courgette|eggplant|aubergine|cabbage|kale|beans|lentils?|chickpeas?|onions?|mushrooms?|cauliflower|pumpkin|beetroot|peas)\b/i;

const PROTEIN_FOODS: Record<string, string[]> = {
  omni: ["chicken-breast", "tuna-canned", "egg", "greek-yogurt", "cottage-cheese", "salmon"],
  veg: ["egg", "greek-yogurt", "cottage-cheese", "skyr", "tofu", "lentils"],
  vegan: ["tofu", "tempeh", "lentils", "chickpeas-dry", "edamame", "peanut-butter"],
};
const ENERGY_FOODS = ["peanut-butter", "oats", "banana", "olive-oil", "almonds", "rice", "dates"];

/** "150 g chicken breast (about 46 g protein)": real numbers from our ingredient table, never guessed. */
export function proteinIdeas(gapGrams: number, diet: string | null | undefined, n = 3): string[] {
  const want = Math.max(15, Math.min(30, gapGrams)); // one realistic serving, not the whole gap
  return (PROTEIN_FOODS[diet === "vegan" ? "vegan" : diet === "veg" ? "veg" : "omni"])
    .map((id) => ING_BY_ID.get(id)).filter((x): x is NonNullable<typeof x> => !!x && x.protein >= 5)
    .map((ing) => {
      const g = Math.max(10, Math.round(want / (ing.protein / 100) / 10) * 10);
      return { score: Math.abs(g - 150) + (g * ing.kcal) / 100 / 4 * (((g * ing.kcal) / 100) > 450 ? 100 : 0), text: `${g} g ${nameOf(ing, "en")} (about ${r0((g * ing.protein) / 100)} g protein, ${r0((g * ing.kcal) / 100)} kcal)` };
    })
    .sort((a, b) => a.score - b.score).slice(0, n).map((x) => x.text);
}
export function energyIdeas(gapKcal: number, n = 3): string[] {
  const want = Math.max(150, Math.min(600, gapKcal));
  return ENERGY_FOODS.map((id) => ING_BY_ID.get(id)).filter((x): x is NonNullable<typeof x> => !!x)
    .map((ing) => { const g = Math.max(10, Math.round(want / 2 / (ing.kcal / 100) / 5) * 5); return { score: Math.abs(g - 60), text: `${g} g ${nameOf(ing, "en")} (about ${r0((g * ing.kcal) / 100)} kcal)` }; })
    .sort((a, b) => a.score - b.score).slice(0, n).map((x) => x.text);
}

const rank = { warn: 0, tip: 1, good: 2 } as const;
function finish(findings: Finding[], empty = false): FoodAnalysis {
  findings.sort((a, b) => rank[a.level] - rank[b.level]);
  const warns = findings.some((f) => f.level === "warn"), tips = findings.some((f) => f.level === "tip");
  const verdict = warns ? "off" : tips ? "mostly" : "fits";
  return { findings, verdict, empty, headline: empty ? "Nothing logged yet" : verdict === "fits" ? "On track for your goal" : verdict === "mostly" ? "Mostly on track" : "Needs a change to fit your goal" };
}

/** `final`: the day is over (a past day, or late evening). Before that, a shortfall is simply "still to eat", not a problem. */
export function analyzeDay(i: { goal: string | null | undefined; weightKg: number | null; targets: Targets; entries: FoodEntryLite[]; final: boolean; diet?: string | null }): FoodAnalysis {
  const goal: GoalId = goalOf(i.goal);
  const F = FOOD_PROFILES[goal];
  const t = i.targets;
  const e = i.entries;
  if (!e.length || t.kcal <= 0) return finish([], true);
  const sum = e.reduce((a, x) => ({ kcal: a.kcal + x.kcal, protein: a.protein + x.protein, carbs: a.carbs + x.carbs, fat: a.fat + x.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const out: Finding[] = [];
  const r = sum.kcal / t.kcal, pr = t.protein > 0 ? sum.protein / t.protein : 1;
  const build = goal === "muscle" || goal === "strength" || goal === "endurance";

  /* calories */
  if (i.final) {
    if (r < 0.6) out.push({ id: "kcal-very-low", level: "warn", title: "Very little food today", text: `About ${r0(sum.kcal)} kcal against a target of ${t.kcal}. Eating this little makes training hard, slows recovery and makes you lose muscle along with fat. It is also hard to keep up.`, fix: `Add ${r0(t.kcal * 0.8 - sum.kcal)}+ kcal: ${energyIdeas(t.kcal * 0.8 - sum.kcal).join(", ")}.` });
    else if (build && r < 0.85) out.push({ id: "kcal-low-build", level: "warn", title: "Not enough food for your goal", text: `About ${r0(sum.kcal)} kcal against a target of ${t.kcal}. To ${goal === "endurance" ? "keep going longer" : goal === "strength" ? "get stronger" : "build muscle"}, ${F.calories.why}. ${r0(sum.kcal)} is below even your maintenance level.`, fix: `Add about ${r0(t.kcal - sum.kcal)} kcal: ${energyIdeas(t.kcal - sum.kcal).join(", ")}.` });
    else if (build && r < 0.93) out.push({ id: "kcal-low-build-ish", level: "tip", title: "A little under your target", text: `${r0(sum.kcal)} of ${t.kcal} kcal. A slightly bigger intake would help your goal.` });
    else if (goal === "lose" && r < 0.75) out.push({ id: "kcal-too-low-lose", level: "warn", title: "Cutting harder than planned", text: `${r0(sum.kcal)} kcal is far below your ${t.kcal} target (already a deficit). Losing faster than about 1% of body weight a week tends to cost muscle and energy, and big deficits are hard to stick to.`, fix: `Eat up to your target: about ${r0(t.kcal - sum.kcal)} kcal more.` });
    else if ((goal === "maintain" || goal === "recomp") && r < 0.7) out.push({ id: "kcal-low", level: "warn", title: "Well under your target", text: `${r0(sum.kcal)} of ${t.kcal} kcal. For ${goal === "recomp" ? "recomposition" : "staying in shape"} you want to be close to it.`, fix: `About ${r0(t.kcal - sum.kcal)} kcal more.` });
    else if ((goal === "maintain" || goal === "recomp") && r < 0.85) out.push({ id: "kcal-lowish", level: "tip", title: "A bit under your target", text: `${r0(sum.kcal)} of ${t.kcal} kcal.` });
  } else if (r < 0.95) {
    const left = r0(t.kcal - sum.kcal), pleft = Math.max(0, r0(t.protein - sum.protein));
    out.push({ id: "remaining", level: "good", title: "Still to eat today", text: `${left} kcal${pleft ? ` and ${pleft} g protein` : ""} to reach your target.${pleft >= 20 ? ` For example: ${proteinIdeas(pleft, i.diet, 2).join(", or ")}.` : ""}` });
  }
  if (goal === "lose") {
    if (r > 1.15) out.push({ id: "kcal-over-lose", level: "warn", title: "Over your calorie target", text: `${r0(sum.kcal)} kcal against ${t.kcal}. Your target is a moderate deficit, and going over it puts you at maintenance or above, where fat loss stops.`, fix: i.final ? "One day is not a problem. Get back to your target tomorrow." : `Keep the rest of today light: about ${Math.max(0, r0(t.kcal - sum.kcal))} kcal left.` });
    else if (r > 1.05) out.push({ id: "kcal-over-lose-ish", level: "tip", title: "Slightly over target", text: `${r0(sum.kcal)} of ${t.kcal} kcal.` });
  } else if (build) {
    if (r > 1.5) out.push({ id: "kcal-way-over", level: "warn", title: "Far more than you need", text: `${r0(sum.kcal)} kcal is ${Math.round((r - 1) * 100)}% over your ${t.kcal} target. A big surplus mostly turns into body fat rather than extra muscle.`, fix: "A few extra days are fine, but make it the exception." });
    else if (r > 1.3) out.push({ id: "kcal-over-build", level: "tip", title: "A big surplus", text: `${r0(sum.kcal)} of ${t.kcal} kcal. A small surplus builds muscle with less fat gain than a big one.` });
  } else if (r > 1.4) out.push({ id: "kcal-way-over", level: "warn", title: "Well over your target", text: `${r0(sum.kcal)} kcal against ${t.kcal}. Eating well over your needs day after day adds weight.` });
  else if (r > 1.15) out.push({ id: "kcal-over", level: "tip", title: "Over your target", text: `${r0(sum.kcal)} of ${t.kcal} kcal.` });

  /* protein */
  if (i.final) {
    const short = r0(t.protein - sum.protein);
    if (pr < 0.6) out.push({ id: "protein-low", level: "warn", title: "Protein is too low", text: `${r0(sum.protein)} g of ${t.protein} g. Protein is what your muscles are rebuilt from${goal === "lose" ? ", and in a calorie deficit it also protects the muscle you have and keeps hunger down" : ""}. At this level you give away progress.`, fix: `Add about ${short} g over the day. For example (each about 30 g or less): ${proteinIdeas(short, i.diet).join(", ")}.` });
    else if (pr < 0.85) out.push({ id: "protein-low-ish", level: "tip", title: "Protein a little short", text: `${r0(sum.protein)} of ${t.protein} g.`, fix: `About ${short} g more: for example ${proteinIdeas(short, i.diet, 2).join(", or ")}.` });
    else out.push({ id: "protein-ok", level: "good", title: "Protein on target", text: `${r0(sum.protein)} g, against a target of ${t.protein} g.` });
  }
  if (i.weightKg && sum.protein / i.weightKg > F.protein.high && sum.kcal > 800) out.push({ id: "protein-high", level: "tip", title: "More protein than you need", text: `${r0(sum.protein)} g is ${(sum.protein / i.weightKg).toFixed(1)} g per kg of body weight. Past about ${F.protein.high} g/kg you gain nothing extra, and it leaves less room for the carbs and fats that fuel training. If you have kidney problems, ask your doctor before eating a lot of protein.` });

  /* carbs and fat */
  if (i.final && sum.kcal >= 900) {
    const fatShare = (sum.fat * 9) / sum.kcal;
    if (fatShare < 0.18) out.push({ id: "fat-low", level: "tip", title: "Very little fat", text: `Only ${Math.round(fatShare * 100)}% of today's calories came from fat. Fat helps you absorb vitamins A, D, E and K and keeps meals satisfying; around 20 to 35% is the usual advice.`, fix: "Add olive oil, nuts, eggs or fish." });
    else if (fatShare > 0.45) out.push({ id: "fat-high", level: "tip", title: "Mostly fat", text: `${Math.round(fatShare * 100)}% of today's calories came from fat, which leaves little room for carbs and protein to fuel and repair your training.`, fix: "Swap some oil or fried food for rice, potatoes, fruit or lean protein." });
    if (i.weightKg && sum.carbs / i.weightKg < F.carbsFloor) out.push({ id: "carbs-low", level: "tip", title: "Low on carbohydrates", text: `${r0(sum.carbs)} g is ${(sum.carbs / i.weightKg).toFixed(1)} g per kg. Carbohydrates are the main fuel for hard sets${goal === "endurance" ? " and for lasting through long workouts" : ""}; with very few, workouts tend to feel flat.`, fix: "Add rice, oats, potatoes, bread or fruit around your workout." });
  }

  /* spread of protein over meals */
  const byMeal = new Map<string, number>();
  for (const x of e) byMeal.set(x.meal, (byMeal.get(x.meal) ?? 0) + x.protein);
  const top = Math.max(...byMeal.values());
  if (sum.protein >= 70 && byMeal.size >= 1 && top / sum.protein > 0.6 && (i.final || byMeal.size >= 2)) out.push({ id: "protein-spread", level: "tip", title: "Protein is bunched in one meal", text: `${Math.round((top / sum.protein) * 100)}% of today's protein came from one meal. Muscles use protein best when it is spread over three or four meals of roughly 20 to 40 g.`, fix: "Move some protein to breakfast or a snack." });

  /* what the food was, judging by the names (rough) */
  if (i.final && sum.kcal >= 900) {
    const sweet = e.filter((x) => SWEET_FRIED.test(x.name)).reduce((a, x) => a + x.kcal, 0);
    if (sweet / sum.kcal > 0.35) out.push({ id: "treats", level: "tip", title: "A lot of treats and fried food", text: `About ${Math.round((sweet / sum.kcal) * 100)}% of today's calories came from things like sweets, soda, fried food or fast food (judging by the names). They are easy to overeat and low in protein and nutrients.`, fix: "Keep them to a smaller share of your day." });
    if (!e.some((x) => FRUIT_VEG.test(x.name))) out.push({ id: "no-plants", level: "tip", title: "No fruit or vegetables logged", text: "Fruit, vegetables and beans bring fibre, potassium and vitamins that training and recovery use up. If you ate some and didn't log it, ignore this.", fix: "Add a fruit or a salad or cooked vegetables to two meals." });
  }

  if (!out.some((f) => f.level !== "good")) out.push({ id: "fine", level: "good", title: "Fits your goal", text: "Calories and protein are close to what your goal needs." });
  return finish(out);
}

/* ---------- a week ---------- */
export type DayTotal = { day: string; kcal: number; protein: number; logged: boolean };
export type WeightPoint = { day: string; kg: number };
export type WeekAnalysis = { findings: Finding[]; verdict: "fits" | "mostly" | "off"; headline: string; daysLogged: number; avgKcal: number; avgProtein: number; proteinDays: number; trendPctPerWeek: number | null };

/** Change in weight per week as a % of body weight, from a straight line through the weigh-ins (needs two weeks of data to say anything). */
export function weightTrend(points: WeightPoint[]): number | null {
  const p = points.filter((x) => x.kg > 20 && x.kg < 400).sort((a, b) => a.day.localeCompare(b.day));
  if (p.length < 3) return null;
  const t0 = Date.parse(p[0].day), xs = p.map((x) => (Date.parse(x.day) - t0) / 86_400_000), ys = p.map((x) => x.kg);
  if (xs[xs.length - 1] < 10) return null;
  const n = p.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((a, x, k) => a + (x - mx) * (ys[k] - my), 0), den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  if (!den) return null;
  const kgPerWeek = (num / den) * 7;
  return Math.round((kgPerWeek / my) * 1000) / 10;
}

export function analyzeWeek(i: { goal: string | null | undefined; targets: Targets; days: DayTotal[]; weights: WeightPoint[]; diet?: string | null; goalWeightKg?: number | null }): WeekAnalysis {
  const goal = goalOf(i.goal);
  const F = FOOD_PROFILES[goal];
  const logged = i.days.filter((d) => d.logged && d.kcal > 300);
  const out: Finding[] = [];
  const base = { daysLogged: logged.length, avgKcal: 0, avgProtein: 0, proteinDays: 0 };
  const trend = weightTrend(i.weights);
  /* the goal weight picked at sign-up: does it agree with the goal, and how far is it? */
  const nowKg = i.weights.length ? i.weights[i.weights.length - 1].kg : null;
  if (i.goalWeightKg && nowKg) {
    const gap = Math.round((i.goalWeightKg - nowKg) * 10) / 10, abs = Math.abs(gap);
    if (abs >= 0.5) {
      if (gap > 0 && goal === "lose") out.push({ id: "gw-mismatch-lose", level: "tip", title: "Your goal weight is above your weight", text: `Your goal weight is ${i.goalWeightKg} kg, ${abs} kg above your latest weigh-in, but your goal is losing fat. Update one of them in Settings so the targets match what you want.` });
      else if (gap < 0 && (goal === "muscle" || goal === "strength")) out.push({ id: "gw-mismatch-gain", level: "tip", title: "Your goal weight is below your weight", text: `Your goal weight is ${i.goalWeightKg} kg, ${abs} kg below your latest weigh-in, but your goal is building muscle or strength, which usually means eating at or a little above maintenance. Update one of them in Settings if that is not what you want.` });
      else if (gap < 0 && goal === "lose") out.push({ id: "gw-progress", level: "good", title: `${abs} kg to your goal weight`, text: `At the usual pace of about 0.5 to 1% of body weight a week (${(nowKg * 0.005).toFixed(1)} to ${(nowKg * 0.01).toFixed(1)} kg), that is roughly ${Math.max(1, Math.round(abs / (nowKg * 0.0075)))} weeks. Slower is fine, faster costs muscle.` });
      else if (gap > 0 && (goal === "muscle" || goal === "strength")) out.push({ id: "gw-progress", level: "good", title: `${abs} kg to your goal weight`, text: `Gaining about 0.25 to 0.5% of body weight a week keeps most of it as muscle, so allow ${Math.max(2, Math.round(abs / (nowKg * 0.00375)))} weeks or more.` });
    }
  }
  if (logged.length < 3) {
    out.push({ id: "w-few", level: "tip", title: "Log a few more days", text: `Only ${logged.length} day${logged.length === 1 ? "" : "s"} of the last ${i.days.length} have food in them. Three or more days are needed to say anything about your week.` });
    return { ...base, trendPctPerWeek: trend, findings: out, verdict: "mostly", headline: "Not enough days logged yet" };
  }
  const avgKcal = logged.reduce((a, d) => a + d.kcal, 0) / logged.length, avgProtein = logged.reduce((a, d) => a + d.protein, 0) / logged.length;
  const pDays = logged.filter((d) => d.protein >= i.targets.protein * 0.9).length;
  const r = avgKcal / i.targets.kcal;
  const build = goal === "muscle" || goal === "strength" || goal === "endurance";
  if (build && r < 0.9) out.push({ id: "w-kcal-low", level: "warn", title: "Under-eating most days", text: `You averaged ${r0(avgKcal)} kcal against a target of ${i.targets.kcal}. ${F.calories.why[0].toUpperCase() + F.calories.why.slice(1)} — without that energy progress slows.`, fix: `Add about ${r0(i.targets.kcal - avgKcal)} kcal a day: ${energyIdeas(i.targets.kcal - avgKcal, 2).join(", ")}.` });
  else if (goal === "lose" && r > 1.1) out.push({ id: "w-kcal-high", level: "warn", title: "Eating above your fat-loss target", text: `Your average was ${r0(avgKcal)} kcal against a target of ${i.targets.kcal}. At that level you are at or near maintenance, so fat loss stalls.`, fix: `Bring the average down by about ${r0(avgKcal - i.targets.kcal)} kcal a day.` });
  else if (goal === "lose" && r < 0.75) out.push({ id: "w-kcal-too-low", level: "warn", title: "Deficit bigger than planned", text: `You averaged ${r0(avgKcal)} kcal against a target of ${i.targets.kcal}. Cutting this hard tends to cost muscle and energy.`, fix: "Eat closer to your target." });
  else if ((goal === "maintain" || goal === "recomp") && Math.abs(r - 1) > 0.15) out.push({ id: "w-kcal-off", level: "tip", title: "Away from your target", text: `Average ${r0(avgKcal)} kcal against ${i.targets.kcal}.` });
  else out.push({ id: "w-kcal-ok", level: "good", title: "Calories on track", text: `You averaged ${r0(avgKcal)} kcal against a target of ${i.targets.kcal}.` });
  if (pDays / logged.length < 0.5) out.push({ id: "w-protein", level: "warn", title: "Protein target missed most days", text: `You reached your protein target (${i.targets.protein} g) on ${pDays} of ${logged.length} days. The average was ${r0(avgProtein)} g.`, fix: `Pick one protein food per meal: ${proteinIdeas(30, i.diet, 3).join(", ")}.` });
  else if (pDays / logged.length < 0.7) out.push({ id: "w-protein-ish", level: "tip", title: "Protein target hit on some days only", text: `${pDays} of ${logged.length} days (average ${r0(avgProtein)} g against ${i.targets.protein} g).` });
  else out.push({ id: "w-protein-ok", level: "good", title: "Protein steady", text: `On target on ${pDays} of ${logged.length} days.` });
  if (logged.length >= 5) {
    const mean = avgKcal, sd = Math.sqrt(logged.reduce((a, d) => a + (d.kcal - mean) ** 2, 0) / logged.length);
    if (sd / mean > 0.35) out.push({ id: "w-swing", level: "tip", title: "Big swings from day to day", text: `Your calories ranged from ${r0(Math.min(...logged.map((d) => d.kcal)))} to ${r0(Math.max(...logged.map((d) => d.kcal)))}. Steady eating makes progress easier to read and to keep.` });
  }
  /* what the scale says */
  if (trend != null) {
    const t = trend, s = `${t > 0 ? "+" : ""}${t}% a week`;
    if (goal === "lose") {
      if (t > 0.1) out.push({ id: "w-trend-up", level: "warn", title: "Your weight is going up", text: `Your weigh-ins are moving ${s}, but your goal is losing fat. Compare your real intake with the target, and check that the logged amounts are honest (oil, sauces and drinks add up).`, fix: "Lower your daily calories by 150-250 kcal and weigh in again in two weeks." });
      else if (t < -1.2) out.push({ id: "w-trend-fast", level: "warn", title: "Losing weight too fast", text: `${s} is faster than the usual advice of about 0.5 to 1% of body weight a week. Fast loss costs muscle, strength and energy.`, fix: "Eat 150-250 kcal more a day." });
      else if (t > -0.25) out.push({ id: "w-trend-slow", level: "tip", title: "Weight loss is very slow", text: `${s}. That is fine if you prefer slow, but about 0.5 to 1% a week is the usual pace.` });
      else out.push({ id: "w-trend-ok", level: "good", title: "Weight is dropping at a good pace", text: s + "." });
    } else if (goal === "muscle") {
      if (t < -0.1) out.push({ id: "w-trend-down", level: "warn", title: "Your weight is going down", text: `Your weigh-ins are moving ${s}, but your goal is to build muscle. You are most likely not eating enough.`, fix: "Add 200-300 kcal a day, mostly from carbs and protein." });
      else if (t > 0.75) out.push({ id: "w-trend-fast-gain", level: "tip", title: "Gaining quickly", text: `${s} is on the fast side; a lot of that is likely fat. About 0.1 to 0.5% a week keeps most of the gain as muscle.`, fix: "Trim about 150-200 kcal a day." });
      else if (t < 0.05) out.push({ id: "w-trend-flat", level: "tip", title: "Weight is not moving", text: `${s}. If you want to grow, a small step up in calories (about 150-250 kcal a day) usually gets the scale moving.` });
      else out.push({ id: "w-trend-ok", level: "good", title: "Weight is rising slowly", text: s + "." });
    } else if (Math.abs(t) > 0.5) {
      out.push({ id: "w-trend-drift", level: "tip", title: goal === "strength" && t < 0 ? "Losing weight while chasing strength" : "Your weight is drifting", text: `${s}. For ${F.calories.why.includes("steady") ? "staying in shape" : "your goal"} a steady weight is usually what you want.` });
    } else out.push({ id: "w-trend-ok", level: "good", title: "Weight is steady", text: s + "." });
  }
  const f = finish(out);
  return { ...base, daysLogged: logged.length, avgKcal: r0(avgKcal), avgProtein: r0(avgProtein), proteinDays: pDays, trendPctPerWeek: trend, findings: f.findings, verdict: f.verdict, headline: f.verdict === "fits" ? "A good week for your goal" : f.verdict === "mostly" ? "A decent week, with something to improve" : "This week works against your goal" };
}
