import raw from "@/data/foods.json";

/** Open data: USDA Food and Nutrient Database for Dietary Studies (public domain). Values are per 100 g. */
export type Food = { id: number; name: string; category: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number };

const FOODS: Food[] = (raw as unknown as [string, string, number, number, number, number, number, number][]).map((r, i) => ({
  id: i, name: r[0], category: r[1], kcal: r[2], protein: r[3], carbs: r[4], fat: r[5], fiber: r[6], sugar: r[7],
}));
export const FOOD_BY_ID = FOODS;

const NOISE = /\b(nfs|ns as to|not further specified)\b/i;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** "100 g chicken breast", "2x banana", "chicken 150g" -> { q: "chicken breast", grams: 100 }. */
export function parseQuery(input: string): { q: string; grams: number | null } {
  let s = input.trim();
  let grams: number | null = null;
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gram|grams|mg|oz)\b/i);
  if (m) {
    const n = parseFloat(m[1].replace(",", "."));
    const u = m[2].toLowerCase();
    // "mg" for food is almost always a typo for grams
    grams = u === "kg" ? n * 1000 : u === "oz" ? n * 28.35 : n;
    s = s.replace(m[0], " ");
  }
  return { q: s.replace(/\s+/g, " ").trim(), grams };
}

/**
 * What people actually eat, most common first. Used to rank search results, so "boiled" gives eggs and potatoes
 * before goat, and "chicken" gives breast before feet.
 */
const POPULAR = ("egg chicken rice potato bread milk banana apple beef pasta spaghetti tomato cheese oatmeal oat tuna salmon yogurt yoghurt broccoli carrot onion bean lentil pork turkey " +
  "shrimp orange pizza burger sandwich salad soup cereal butter oil sugar honey peanut almond walnut cashew corn pea spinach lettuce cucumber pepper mushroom garlic avocado strawberry " +
  "grape mango pineapple watermelon peach pear lemon berry blueberry cabbage cauliflower zucchini squash pumpkin sweet bacon sausage ham steak fish cod tilapia yam noodle tofu hummus chickpea " +
  "cracker cookie cake chocolate ice juice coffee tea water beer wine").split(" ");
/** Odd cuts, organs and game that nobody means when they type a plain word. */
const EXOTIC = /(goat|squid|octopus|snail|frog|rabbit|venison|bison|buffalo|tripe|tongue|brain|kidney|heart|giblets?|skin|feet|neck|back|tail|gizzards?|oxtail|bones?|turtle|goose|pigeon|ostrich|quail|pheasant|reindeer|elk|moose|whale|seal|beaver|snake|cheek|sweetbread|spleen|lung|udder|jowl|crawfish|crayfish|eel|roe|clams?|oysters?|abalone|lard|organ|baby food|infant|formula|nfs)/;
const MODIFIERS = new Set(["boiled", "fried", "grilled", "baked", "roasted", "steamed", "raw", "cooked", "fresh", "canned", "frozen", "dried", "smoked", "poached", "scrambled", "stewed", "broiled", "sauteed", "toasted", "pickled", "plain", "whole"]);
export const isModifierQuery = (q: string) => { const t = norm(q).split(/[^a-z0-9]+/).filter(Boolean); return t.length > 0 && t.every((x) => MODIFIERS.has(x)); };

/** 0 to about 30: how likely this food is what someone meant. Looks at the main word (the part before the first comma). */
function popularity(name: string): number {
  const n = norm(name);
  const head = n.split(",")[0];
  const words = head.split(/[^a-z0-9]+/).filter(Boolean);
  let best = -1;
  for (const w of words) {
    const base = w.replace(/(es|s)$/, "");
    const i = POPULAR.findIndex((p) => p === w || p === base);
    if (i >= 0 && (best < 0 || i < best)) best = i;
  }
  return best < 0 ? 0 : Math.max(8, 30 - best * 0.5);
}
/** Not scaled by how much the query leans on popularity: an odd cut is just not what was meant. */
const CUT = /\b(breast|thigh|drumstick|loin|chop|tenderloin|fillet|steak|ground|mince)\b/;
const DISH = /\b(with|and|style|sauce|sandwich|wrap|soup|casserole|salad|curry|mixture|dish)\b/;
function adjust(name: string, plainQuery: boolean): number {
  const n = norm(name);
  let a = 0;
  if (EXOTIC.test(n)) a -= 25;
  if (CUT.test(n.split(",")[0]) || CUT.test(n)) a += 6;
  if (plainQuery && DISH.test(n)) a -= 4;
  return a;
}

export function searchFoods(query: string, limit = 25): Food[] {
  const toks = norm(query).split(/[^a-z0-9]+/).filter(Boolean);
  if (!toks.length) return [];
  const modifierOnly = isModifierQuery(query);
  const scored: { f: Food; s: number }[] = [];
  for (const f of FOODS) {
    const n = norm(f.name);
    let s = 0, ok = true;
    for (const t of toks) {
      const i = n.indexOf(t);
      if (i < 0) { ok = false; break; }
      const wordStart = i === 0 || /[^a-z0-9]/.test(n[i - 1]);
      s += wordStart ? 10 : 3;
      if (i === 0 && !modifierOnly) s += 8;
    }
    if (!ok) continue;
    s -= n.length * 0.12;
    if (NOISE.test(f.name)) s -= 1;
    if (/^(.*), (raw|cooked)/.test(n)) s += 2;
    // common foods first: all the more when the words typed only describe how it is cooked ("boiled") and say nothing about what
    s += popularity(f.name) * (modifierOnly ? 2 : 0.6) + adjust(f.name, toks.length <= 2);
    scored.push({ f, s });
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.f);
}

export const macrosFor = (per100: { kcal: number; protein: number; carbs: number; fat: number }, grams: number) => ({
  kcal: Math.round(per100.kcal * grams) / 100,
  protein: Math.round(per100.protein * grams * 10) / 1000,
  carbs: Math.round(per100.carbs * grams * 10) / 1000,
  fat: Math.round(per100.fat * grams * 10) / 1000,
});
