import RECIPE_ROWS from "@/data/recipes";
import { ING_BY_ID, LANG_IDS, nameOf, type Ingredient, type Lang } from "@/lib/food-index";

/* ---------- Equipment ---------- */
export const EQUIPMENT = [
  { id: "pot", label: "Cooking pot" },
  { id: "pan", label: "Frying pan" },
  { id: "oven", label: "Oven" },
  { id: "microwave", label: "Microwave" },
  { id: "blender", label: "Blender" },
  { id: "rice-cooker", label: "Rice cooker" },
  { id: "air-fryer", label: "Air fryer" },
  { id: "grill", label: "Grill / BBQ" },
  { id: "toaster", label: "Toaster" },
] as const;
export const EQUIP_LABEL: Record<string, string> = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e.label]));
export const DEFAULT_EQUIPMENT = ["pot", "pan", "oven", "microwave"];

/* ---------- Diets ---------- */
export const DIETS = [
  { id: "vegetarian", label: "Vegetarian", ban: "mfbk" },
  { id: "vegan", label: "Vegan", ban: "mfbkdeh" },
  { id: "pescatarian", label: "Pescatarian", ban: "mk" },
  { id: "halal", label: "Halal", ban: "ka" },
  { id: "gluten-free", label: "Gluten-free", ban: "g" },
  { id: "dairy-free", label: "Dairy-free", ban: "d" },
  { id: "nut-free", label: "Nut-free", ban: "n" },
] as const;
export type Diet = (typeof DIETS)[number]["id"];
const banFor = (diets: Diet[]) => DIETS.filter((d) => diets.includes(d.id)).map((d) => d.ban).join("");
const violates = (ing: Ingredient, ban: string) => [...ing.flags].some((f) => ban.includes(f));

/* ---------- Recipes ---------- */
export type Slot = { alts: string[]; grams: number; optional: boolean; essential: boolean };
export type Recipe = { id: string; name: string; cuisine: string; meals: string; time: number; equipment: string[][]; servings: number; slots: Slot[]; steps: string[]; /** written by the user (see lib/cooklang.ts) */ mine?: boolean };

export const RECIPES: Recipe[] = RECIPE_ROWS.split("\n").map((l) => l.trim()).filter((l) => /^[a-z0-9-]+\|/.test(l)).map((l) => {
  const p = l.split("|");
  return {
    id: p[0], name: p[1], cuisine: p[2], meals: p[3], time: +p[4],
    equipment: p[5] === "-" ? [] : p[5].split(",").map((g) => g.split("/")),
    servings: +p[6],
    slots: p[7].split(",").map((t) => {
      const m = t.match(/^([^:]+):([\d.]+)([?!]*)$/)!;
      return { alts: m[1].split("/"), grams: +m[2], optional: m[3].includes("?"), essential: m[3].includes("!") };
    }),
    steps: p[8].split("¦").map((s) => s.trim()).filter(Boolean),
  };
});
export const RECIPE_BY_ID = new Map(RECIPES.map((r) => [r.id, r]));

/** Things everyone is assumed to have in the kitchen. We never ask about these. */
const BASICS = new Set(["olive-oil", "vegetable-oil", "butter", "ghee", "flour", "sugar", "brown-sugar", "honey", "baking-powder", "yeast", "cornstarch", "vinegar", "balsamic", "stock-cube", "chicken-stock", "vegetable-stock", "mustard", "ketchup", "mayonnaise", "tomato-paste", "water", "salt", "black-pepper"]);

/** What else a user's ingredient can stand in for. Lets "basmati rice" cook a recipe that says "rice". */
const SUBS: Record<string, string[]> = {
  rice: ["basmati-rice", "brown-rice", "sushi-rice"], "basmati-rice": ["rice", "brown-rice"], "sushi-rice": ["rice"],
  pasta: ["spaghetti"], spaghetti: ["pasta"],
  onion: ["red-onion"], "red-onion": ["onion"], "spring-onion": ["leek"],
  "chicken-breast": ["chicken-thigh", "chicken-whole", "turkey-breast"], "chicken-thigh": ["chicken-breast", "chicken-whole"],
  "ground-beef": ["ground-lamb", "ground-turkey"], "ground-lamb": ["ground-beef", "ground-turkey"], "ground-turkey": ["ground-beef", "ground-lamb"],
  "tomato-canned": ["tomato", "tomato-sauce", "cherry-tomato"], tomato: ["cherry-tomato", "tomato-canned"], "cherry-tomato": ["tomato"], "tomato-sauce": ["tomato-canned"],
  yogurt: ["greek-yogurt", "skyr"], "greek-yogurt": ["yogurt", "skyr"], skyr: ["greek-yogurt", "yogurt"],
  lemon: ["lime"], lime: ["lemon"],
  "red-lentils": ["lentils"], lentils: ["red-lentils"],
  "kidney-beans": ["black-beans", "white-beans"], "black-beans": ["kidney-beans", "white-beans"], "white-beans": ["kidney-beans", "black-beans"],
  "white-fish": ["cod", "sea-bass"], cod: ["white-fish", "sea-bass"], "sea-bass": ["white-fish", "cod"],
  milk: ["plant-milk"], "plant-milk": ["milk"],
  "coriander-fresh": ["parsley"], parsley: ["coriander-fresh"],
  "curry-powder": ["garam-masala"], "garam-masala": ["curry-powder"],
  paprika: ["smoked-paprika"], "smoked-paprika": ["paprika"],
  "chili-flakes": ["chili-powder", "cayenne"], "chili-powder": ["chili-flakes", "cayenne"],
  noodles: ["spaghetti", "pasta"],
};
const satisfiedBy = (need: string) => [need, ...(SUBS[need] ?? [])];

/** A seasoning, herb or specific sauce we ask about instead of assuming. */
const isSeasoning = (ing: Ingredient, essential: boolean) => ing.flags.includes("x") || (ing.flags.includes("p") && essential && !BASICS.has(ing.id));
export const isStaple = (id: string) => BASICS.has(id) || (ING_BY_ID.get(id)?.flags.includes("s") ?? false);

export type Kitchen = { equipment: string[]; haveSpices: string[]; noSpices: string[] };
export type Goal = "lose" | "recomp" | "maintain" | "muscle" | "strength" | string;
export type Time = "quick" | "any" | "slow";
export type FinderQuery = {
  have: string[]; kitchen: Kitchen; diets: Diet[]; time: Time; meal: "any" | "b" | "l" | "d" | "s";
  maxMissing: 0 | 1 | 2; goal: Goal; dayKcal: number; showBlocked: boolean;
};

export type Ask = { id: string; name: string; essential: boolean; answer: "yes" | "no" | null };
export type LineItem = {
  id: string; name: string; grams: number; state: "have" | "missing" | "staple" | "optional-have" | "optional-no" | "ask-yes" | "ask-no" | "ask";
  essential: boolean; alt: string[];
};
export type Result = {
  recipe: Recipe; status: "ready" | "almost"; missing: string[]; asks: Ask[]; lines: LineItem[];
  per: { kcal: number; protein: number; carbs: number; fat: number; grams: number }; score: number; why: string[]; blockedBy: string[];
};

const mealShare: Record<string, number> = { any: 0.3, b: 0.25, l: 0.33, d: 0.35, s: 0.1 };

/** Work out one recipe for one person: what they have, what is missing, what we still need to ask, and the nutrition per serving. */
export function evaluate(r: Recipe, q: FinderQuery, lang: Lang): Result | null {
  const ban = banFor(q.diets);
  const haveSet = new Set<string>();
  for (const id of q.have) for (const s of Object.entries(SUBS).filter(([, v]) => v.includes(id)).map(([k]) => k).concat(id)) haveSet.add(s);
  const spiceYes = new Set([...q.kitchen.haveSpices, ...q.have]);
  const spiceNo = new Set(q.kitchen.noSpices.filter((s) => !q.have.includes(s)));

  const lines: LineItem[] = [];
  const asks: Ask[] = [];
  const missing: string[] = [];
  let kcal = 0, protein = 0, carbs = 0, fat = 0, grams = 0;
  const add = (ing: Ingredient, g: number) => { kcal += (ing.kcal * g) / 100; protein += (ing.protein * g) / 100; carbs += (ing.carbs * g) / 100; fat += (ing.fat * g) / 100; grams += g; };

  for (const slot of r.slots) {
    const allowed = slot.alts.map((a) => ING_BY_ID.get(a)!).filter((i) => i && !violates(i, ban));
    if (!allowed.length) {
      if (slot.optional) continue; // an optional extra that breaks the diet is simply dropped
      return null; // a required ingredient that breaks the diet: recipe is out
    }
    const seasoning = allowed.every((i) => isSeasoning(i, slot.essential));
    const first = allowed[0];
    const hasIt = allowed.find((i) => satisfiedBy(i.id).some((s) => haveSet.has(s) || (seasoning && spiceYes.has(s))));

    if (seasoning) {
      const ing = hasIt ?? first;
      const asked = spiceYes.has(ing.id) || [...(SUBS[ing.id] ?? [])].some((s) => spiceYes.has(s));
      const said = asked ? "yes" : spiceNo.has(ing.id) ? "no" : null;
      if (slot.optional && said !== "yes") { lines.push({ id: ing.id, name: nameOf(ing, lang), grams: slot.grams, state: said === "no" ? "ask-no" : "ask", essential: false, alt: [] }); asks.push({ id: ing.id, name: nameOf(ing, lang), essential: false, answer: said }); continue; }
      if (said === "yes") { lines.push({ id: ing.id, name: nameOf(ing, lang), grams: slot.grams, state: "ask-yes", essential: slot.essential, alt: [] }); add(ing, slot.grams); continue; }
      if (said === "no") {
        lines.push({ id: ing.id, name: nameOf(ing, lang), grams: slot.grams, state: "ask-no", essential: slot.essential, alt: [] });
        if (slot.essential) missing.push(nameOf(ing, lang));
        asks.push({ id: ing.id, name: nameOf(ing, lang), essential: slot.essential, answer: "no" });
        continue;
      }
      lines.push({ id: ing.id, name: nameOf(ing, lang), grams: slot.grams, state: "ask", essential: slot.essential, alt: [] });
      asks.push({ id: ing.id, name: nameOf(ing, lang), essential: slot.essential, answer: null });
      add(ing, slot.grams);
      continue;
    }

    const staple = allowed.some((i) => isStaple(i.id));
    if (staple && !hasIt) { const ing = allowed.find((i) => isStaple(i.id))!; lines.push({ id: ing.id, name: nameOf(ing, lang), grams: slot.grams, state: "staple", essential: false, alt: [] }); if (!slot.optional) add(ing, slot.grams); continue; }
    if (slot.optional) {
      if (hasIt) { lines.push({ id: hasIt.id, name: nameOf(hasIt, lang), grams: slot.grams, state: "optional-have", essential: false, alt: [] }); add(hasIt, slot.grams); }
      else lines.push({ id: first.id, name: nameOf(first, lang), grams: slot.grams, state: "optional-no", essential: false, alt: [] });
      continue;
    }
    if (hasIt) { lines.push({ id: hasIt.id, name: nameOf(hasIt, lang), grams: slot.grams, state: "have", essential: slot.essential, alt: allowed.filter((i) => i !== hasIt).map((i) => nameOf(i, lang)) }); add(hasIt, slot.grams); }
    else {
      lines.push({ id: first.id, name: allowed.map((i) => nameOf(i, lang)).join(" or "), grams: slot.grams, state: "missing", essential: slot.essential, alt: [] });
      missing.push(allowed.map((i) => nameOf(i, lang)).join(" or "));
      add(first, slot.grams);
    }
  }

  if (missing.length > q.maxMissing) return null;

  // Equipment: every group needs at least one tool the person owns
  const owned = new Set(q.kitchen.equipment);
  const blockedBy = r.equipment.filter((g) => !g.some((e) => owned.has(e))).map((g) => g.map((e) => EQUIP_LABEL[e] ?? e).join(" or "));
  if (blockedBy.length && !q.showBlocked) return { recipe: r, status: "ready", missing, asks, lines, per: { kcal: 0, protein: 0, carbs: 0, fat: 0, grams: 0 }, score: -1, why: [], blockedBy };

  if (q.time === "quick" && r.time > 30) return null;
  if (q.time === "slow" && r.time < 60) return null;
  if (q.meal !== "any" && !r.meals.includes(q.meal)) return null;

  const sv = r.servings;
  const per = { kcal: kcal / sv, protein: protein / sv, carbs: carbs / sv, fat: fat / sv, grams: grams / sv };

  // Goal fit
  const M = Math.max(250, q.dayKcal * mealShare[q.meal]);
  const pd = per.kcal > 0 ? (per.protein * 4) / per.kcal : 0;
  const closeness = (target: number) => Math.max(0, 1 - Math.abs(per.kcal - target) / target);
  let fit = 0;
  const why: string[] = [];
  if (q.goal === "lose" || q.goal === "recomp") {
    fit = 32 * Math.min(1, pd / 0.35) + 28 * (per.kcal <= M ? 1 : Math.max(0, 1 - (per.kcal - M) / M));
    if (per.protein >= 25) why.push("High protein");
    if (per.kcal <= M * 0.9) why.push("Light on calories");
  } else if (q.goal === "muscle" || q.goal === "strength") {
    fit = 32 * Math.min(1, per.protein / 40) + 28 * closeness(M * 1.15);
    if (per.protein >= 30) why.push("High protein");
    if (per.kcal >= M) why.push("Fuels a build");
  } else if (q.goal === "endurance") {
    const cd = per.kcal > 0 ? (per.carbs * 4) / per.kcal : 0;
    fit = 22 * Math.min(1, cd / 0.5) + 14 * Math.min(1, per.protein / 25) + 24 * closeness(M);
    if (cd >= 0.45) why.push("Carbs to fuel you");
    if (per.protein >= 20) why.push("Good protein");
  } else {
    fit = 30 * closeness(M) + 30 * Math.min(1, pd / 0.25);
    if (per.protein >= 25) why.push("Good protein");
    if (closeness(M) > 0.8) why.push("Right-sized meal");
  }
  const status: Result["status"] = missing.length === 0 ? "ready" : "almost";
  const score = (status === "ready" ? 100 : 60 - 15 * missing.length) + fit - asks.filter((a) => a.answer === null && a.essential).length * 2;
  return { recipe: r, status, missing, asks, lines, per, score, why, blockedBy };
}

export function findRecipes(q: FinderQuery, lang: Lang, extra: Recipe[] = []): { results: Result[]; blocked: Result[] } {
  const results: Result[] = [], blocked: Result[] = [];
  for (const r of [...extra, ...RECIPES]) {
    const e = evaluate(r, q, lang);
    if (!e) continue;
    (e.blockedBy.length && !q.showBlocked ? blocked : results).push(e);
  }
  results.sort((a, b) => b.score - a.score);
  return { results, blocked };
}

/** "2 tsp", "a pinch", "250 g" or "2 eggs": a readable amount for the cook. */
export function amount(ing: Ingredient | undefined, grams: number, scale: number): string {
  const g = grams * scale;
  if (ing && (ing.flags.includes("x") || ing.cat === "spice" || ing.cat === "herb") && g <= 12) {
    if (ing.cat === "herb" || ing.id.includes("fresh")) return g <= 6 ? "a small handful" : "a handful";
    if (g <= 1.2) return "a pinch";
    if (g <= 3.5) return `${Math.round(g / 2.5) || 1} tsp`;
    if (g <= 6) return `${Math.round(g / 2.5)} tsp`;
    return `${Math.round(g / 7)} tbsp`;
  }
  if (ing && ing.piece > 0 && g >= ing.piece * 0.7) {
    const n = g / ing.piece; const r = Math.round(n * 2) / 2;
    const frac = r % 1 ? `${Math.floor(r) || ""}½` : `${r}`;
    const unit = ing.id === "garlic" ? "cloves" : r === 1 ? "piece" : "pieces";
    if (r >= 1 && Math.abs(n - r) < 0.25) return `${frac}${unit ? ` ${unit}` : ""} · ${Math.round(g / 5) * 5} g`;
  }
  if (g < 20 && ing && ["fat", "sauce"].includes(ing.cat)) return `${Math.max(1, Math.round(g / 15))} tbsp`;
  return `${Math.round(g / 5) * 5 || Math.round(g)} g`;
}

/** If the person says "no" to a spice, a quick stand-in. */
export const SPICE_TIPS: Record<string, string> = {
  paprika: "Use a pinch of chili powder plus a little sugar, or leave it out for a milder dish.",
  "smoked-paprika": "Regular paprika works, or a pinch of cumin for smokiness.",
  cumin: "Ground coriander is the closest swap, or just skip it.",
  "curry-powder": "Mix turmeric, cumin and a little chili, or use garam masala.",
  "garam-masala": "Curry powder works, or a pinch of cinnamon plus cumin.",
  turmeric: "It mostly adds colour and earthiness. Skip it or add a little curry powder.",
  "ras-el-hanout": "Mix cumin, cinnamon, paprika and a pinch of ginger.",
  berbere: "Chili powder, paprika, a little cinnamon and ginger get you close.",
  baharat: "Cumin, paprika, cinnamon and a little black pepper.",
  ginger: "Skip it, or use a pinch of ground ginger.",
  oregano: "Thyme or mixed Italian herbs are fine.",
  thyme: "Oregano, rosemary or mixed herbs.",
  parsley: "Fresh coriander, dill or simply leave it off.",
  "coriander-fresh": "Parsley is a good stand-in.",
  cinnamon: "A tiny pinch of allspice or nutmeg, or skip it.",
  cardamom: "A pinch of cinnamon plus a few cloves, or leave out.",
  saffron: "A pinch of turmeric gives the colour (not the flavour).",
  "chili-flakes": "Black pepper or a dash of hot sauce.",
  "chili-powder": "Chili flakes, cayenne or a dash of hot sauce.",
  coriander: "Cumin works in a pinch.",
  "soy-sauce": "Use salt plus a splash of stock or vinegar.",
  "gochujang": "Mix chili flakes, a spoon of tomato paste and a little sugar.",
  "curry-paste": "Fry curry powder with garlic and a little oil instead.",
  miso: "A stock cube dissolved in the water, with a little soy sauce.",
  pesto: "Blend basil or parsley with oil, garlic and nuts, or use oil and herbs.",
  mint: "Parsley or skip.",
  dill: "Parsley or fennel fronds.",
};
export const tipFor = (id: string) => SPICE_TIPS[id] ?? "Leave it out. The dish will be a little milder.";

void LANG_IDS;

/** Nutrition for one serving of a recipe, using the first choice for every "either/or" ingredient (no pantry needed). */
export function recipePer(r: Recipe) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0, grams = 0;
  for (const s of r.slots) {
    if (s.optional) continue;
    const ing = ING_BY_ID.get(s.alts[0]); if (!ing) continue;
    const f = s.grams / 100; kcal += ing.kcal * f; protein += ing.protein * f; carbs += ing.carbs * f; fat += ing.fat * f; grams += s.grams;
  }
  const n = Math.max(1, r.servings);
  return { kcal: Math.round(kcal / n), protein: Math.round((protein / n) * 10) / 10, carbs: Math.round((carbs / n) * 10) / 10, fat: Math.round((fat / n) * 10) / 10, grams: Math.round(grams / n) };
}
