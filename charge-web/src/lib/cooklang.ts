// Client-safe. A small reader for recipes written in the Cooklang style (https://cooklang.org, MIT licence). Our own implementation of the idea.
//   @onion{2}            an ingredient with a quantity      @olive oil{1%tbsp}   quantity and unit      @salt   no quantity
//   @feta{50%g}(optional) a note in brackets (the word "optional" marks it optional)
//   #large pan{}  or  #pot       cookware
//   ~{25%minutes}  or  ~simmer{25%minutes}      a timer
//   -- a comment (ignored)        a blank line starts a new step
import { findIngredients, ING_BY_ID, type Ingredient } from "./food-index";
import type { Recipe } from "./recipes";

export type Token =
  | { t: "text"; v: string }
  | { t: "ing"; name: string; qty: number | null; unit: string; note: string; id: string | null }
  | { t: "cook"; name: string }
  | { t: "timer"; name: string; seconds: number };
export type CookStep = { tokens: Token[] };
export type IngLine = { key: string; name: string; id: string | null; qty: number | null; unit: string; optional: boolean; grams: number | null };
export type Parsed = { steps: CookStep[]; ingredients: IngLine[]; cookware: string[]; totalTimerSeconds: number };

const TOKEN = /@([^@#~{}\n]*?)\{([^{}]*)\}(?:\(([^)]*)\))?|@([^\s@#~{}().,;:!?]+)|#([^@#~{}\n]*?)\{[^{}]*\}|#([^\s@#~{}().,;:!?]+)|~([^@#~{}\n]*?)\{([^{}]*)\}/g;

const parseQty = (raw: string): { qty: number | null; unit: string } => {
  const [q, u = ""] = raw.split("%").map((s) => s.trim());
  if (!q) return { qty: null, unit: u };
  const frac = q.match(/^(\d+)\s*\/\s*(\d+)$/);
  const mixed = q.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  const n = mixed ? +mixed[1] + +mixed[2] / +mixed[3] : frac ? +frac[1] / +frac[2] : parseFloat(q.replace(",", "."));
  return Number.isFinite(n) ? { qty: n, unit: u } : { qty: null, unit: u || q };
};
const SECONDS: [RegExp, number][] = [[/^(h|hr|hrs|hour|hours)$/i, 3600], [/^(m|min|mins|minute|minutes)$/i, 60], [/^(s|sec|secs|second|seconds)$/i, 1]];
const unitSeconds = (u: string) => SECONDS.find(([re]) => re.test(u.trim()))?.[1] ?? 60;

/** Which of our ingredients does this name mean? "chicken breast", "Olive Oil" or an id like "olive-oil". */
export function matchIngredient(name: string): Ingredient | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  const ALIAS: Record<string, string> = { pepper: "black-pepper", "ground pepper": "black-pepper", "ground black pepper": "black-pepper", "black pepper": "black-pepper" };
  const direct = ING_BY_ID.get(ALIAS[n] ?? n.replace(/\s+/g, "-"));
  if (direct) return direct;
  const hit = findIngredients(n, 1)[0];
  if (hit) return hit;
  // "all-purpose flour" -> "flour", "lemon juice" -> "lemon": try the last words, then the first words
  const w = n.split(/\s+/);
  for (let k = 1; k < w.length; k++) { const h = findIngredients(w.slice(k).join(" "), 1)[0]; if (h) return h; }
  for (let k = w.length - 1; k >= 1; k--) { const h = findIngredients(w.slice(0, k).join(" "), 1)[0]; if (h) return h; }
  return null;
}

const UNIT_G: Record<string, number> = {
  g: 1, gram: 1, grams: 1, kg: 1000, mg: 0.001, oz: 28.35, lb: 453.6, lbs: 453.6,
  ml: 1, l: 1000, cl: 10, dl: 100, tsp: 5, teaspoon: 5, teaspoons: 5, tbsp: 15, tablespoon: 15, tablespoons: 15, cup: 240, cups: 240,
};
/** Grams for a quantity and unit. A bare number (or "piece", "clove"...) means that many whole pieces of the ingredient. */
export function toGrams(qty: number | null, unit: string, ing: Ingredient | null): number | null {
  if (qty == null) return null;
  const u = unit.trim().toLowerCase();
  if (u in UNIT_G) return qty * UNIT_G[u];
  if ((u === "" || /^(pc|pcs|piece|pieces|clove|cloves|slice|slices|whole|large|medium|small)$/.test(u)) && ing && ing.piece > 0) return qty * ing.piece;
  return null;
}

const fmtQty = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
/** "300 g", "2", "1 tbsp" as text, scaled. */
export const qtyText = (qty: number | null, unit: string, scale = 1) => (qty == null ? "" : `${fmtQty(qty * scale)}${unit ? ` ${unit}` : ""}`);

export function parseCook(src: string): Parsed {
  const steps: CookStep[] = [];
  const lines: Map<string, IngLine> = new Map();
  const cookware: string[] = [];
  let timers = 0;
  const paras = src.replace(/\r/g, "").split(/\n\s*\n/).map((p) => p.split("\n").filter((l) => !l.trim().startsWith("--") && !l.trim().startsWith(">>")).join(" ").replace(/\s+/g, " ").trim()).filter(Boolean);
  for (const p of paras) {
    const tokens: Token[] = []; let last = 0; let m: RegExpExecArray | null;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(p))) {
      if (m.index > last) tokens.push({ t: "text", v: p.slice(last, m.index) });
      last = m.index + m[0].length;
      if (m[0][0] === "@") {
        const name = (m[1] ?? m[4] ?? "").trim(); const { qty, unit } = parseQty(m[2] ?? ""); const note = (m[3] ?? "").trim();
        if (!name) { tokens.push({ t: "text", v: m[0] }); continue; }
        const ing = matchIngredient(name);
        tokens.push({ t: "ing", name, qty, unit, note, id: ing?.id ?? null });
        const optional = /optional/i.test(note);
        const key = `${ing?.id ?? name.toLowerCase()}|${unit.toLowerCase()}|${optional ? 1 : 0}`;
        const have = lines.get(key);
        if (have) have.qty = have.qty == null || qty == null ? have.qty ?? qty : have.qty + qty;
        else lines.set(key, { key, name, id: ing?.id ?? null, qty, unit, optional, grams: null });
      } else if (m[0][0] === "#") {
        const name = (m[5] ?? m[6] ?? "").trim(); if (!name) { tokens.push({ t: "text", v: m[0] }); continue; }
        tokens.push({ t: "cook", name }); if (!cookware.includes(name.toLowerCase())) cookware.push(name.toLowerCase());
      } else {
        const { qty, unit } = parseQty(m[8] ?? ""); const secs = qty == null ? 0 : Math.round(qty * unitSeconds(unit));
        if (secs <= 0) { tokens.push({ t: "text", v: m[0] }); continue; }
        tokens.push({ t: "timer", name: (m[7] ?? "").trim(), seconds: secs }); timers += secs;
      }
    }
    if (last < p.length) tokens.push({ t: "text", v: p.slice(last) });
    steps.push({ tokens });
  }
  const ingredients = [...lines.values()].map((l) => ({ ...l, grams: toGrams(l.qty, l.unit, l.id ? ING_BY_ID.get(l.id) ?? null : null) }));
  return { steps, ingredients, cookware, totalTimerSeconds: timers };
}

/** Plain text of a step, with the markers removed ("Fry the onion for 5 minutes"). */
export const stepText = (s: CookStep) => s.tokens.map((t) => (t.t === "text" ? t.v : t.t === "ing" || t.t === "cook" ? t.name : t.name || fmtTimer(t.seconds))).join("").replace(/\s+/g, " ").trim();
export const fmtTimer = (s: number) => (s >= 3600 && s % 3600 === 0 ? `${s / 3600} h` : s >= 60 && s % 60 === 0 ? `${s / 60} min` : s > 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);

/** Nutrition for the whole recipe from the ingredients we recognise and can weigh. Others are listed as left out. */
export function nutritionOf(p: Parsed, servings: number) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0, grams = 0; const left: string[] = [];
  for (const l of p.ingredients) {
    const ing = l.id ? ING_BY_ID.get(l.id) : null;
    if (!ing || l.grams == null) { if (!l.optional || ing) left.push(l.name); continue; }
    const f = l.grams / 100; kcal += ing.kcal * f; protein += ing.protein * f; carbs += ing.carbs * f; fat += ing.fat * f; grams += l.grams;
  }
  const s = Math.max(1, servings);
  return { perServing: { kcal: Math.round(kcal / s), protein: Math.round((protein / s) * 10) / 10, carbs: Math.round((carbs / s) * 10) / 10, fat: Math.round((fat / s) * 10) / 10, grams: Math.round(grams / s) }, left };
}

const EQUIP_WORDS: [RegExp, string][] = [[/pot|saucepan|casserole|dutch/, "pot"], [/pan|skillet|wok/, "pan"], [/oven|tray|baking|roasting/, "oven"], [/microwave/, "microwave"], [/blender|food processor|mixer/, "blender"], [/rice cooker/, "rice-cooker"], [/air.?fryer/, "air-fryer"], [/grill|bbq|barbecue/, "grill"], [/toaster/, "toaster"]];

export type MyRecipe = { id: string; name: string; servings: number; minutes: number; meals: string; text: string };

/** A recipe of your own, in the shape the recipe finder understands. */
export function toRecipe(m: MyRecipe): Recipe & { mine: true } {
  const p = parseCook(m.text);
  const slots = p.ingredients.filter((l) => l.id).map((l) => ({ alts: [l.id!], grams: Math.max(1, Math.round(l.grams ?? 30)), optional: l.optional, essential: false }));
  const eq = [...new Set(p.cookware.flatMap((c) => EQUIP_WORDS.filter(([re]) => re.test(c)).map(([, id]) => id)))].map((e) => [e]);
  return { id: `mine:${m.id}`, name: m.name, cuisine: "My recipe", meals: m.meals || "ld", time: m.minutes, equipment: eq, servings: m.servings, slots, steps: p.steps.map(stepText), mine: true };
}

/** Cook-mode steps for the recipes that come with the app: plain text, with times like "4 to 5 minutes" turned into timers. */
const TIME_RE = /(\d+)(?:\s*(?:to|-|–)\s*(\d+))?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;
export function textToStep(text: string): CookStep {
  const tokens: Token[] = []; let last = 0; let m: RegExpExecArray | null;
  TIME_RE.lastIndex = 0;
  while ((m = TIME_RE.exec(text))) {
    const secs = Math.round(+m[1] * unitSeconds(m[3]));
    if (secs < 20 || secs > 6 * 3600) continue;
    tokens.push({ t: "text", v: text.slice(last, m.index) }, { t: "timer", name: m[0], seconds: secs }); last = m.index + m[0].length;
  }
  tokens.push({ t: "text", v: text.slice(last) });
  return { tokens };
}
