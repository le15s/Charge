// Turns a web page's recipe data (schema.org/Recipe, the JSON-LD most recipe sites publish) into our recipe text. Our own code; the idea follows the MIT-licensed recipe-scrapers project.
import { matchIngredient } from "./cooklang";

export type Draft = { name: string; servings: number; minutes: number; text: string; sourceUrl: string; found: { ingredients: number; steps: number; recognised: number } };

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", deg: "°", frac12: "½" };
const decode = (s: string) => s.replace(/&(#x?[0-9a-f]+|[a-z0-9]+);/gi, (m, e: string) => {
  if (e[0] === "#") { const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ""; }
  return ENT[e.toLowerCase()] ?? m;
});
const plain = (s: string) => decode(s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|li|div)>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

type J = Record<string, unknown>;
const isObj = (v: unknown): v is J => !!v && typeof v === "object" && !Array.isArray(v);
const hasType = (o: J, t: string) => { const ty = o["@type"]; return ty === t || (Array.isArray(ty) && ty.includes(t)); };

/** Finds the Recipe object inside the page's JSON-LD blocks (it can sit in a list, or in an @graph). */
export function findRecipeJson(html: string): J | null {
  const re = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  const walk = (v: unknown, depth = 0): J | null => {
    if (depth > 6) return null;
    if (Array.isArray(v)) { for (const x of v) { const r = walk(x, depth + 1); if (r) return r; } return null; }
    if (!isObj(v)) return null;
    if (hasType(v, "Recipe")) return v;
    if (v["@graph"]) return walk(v["@graph"], depth + 1);
    return null;
  };
  while ((m = re.exec(html))) {
    try { const r = walk(JSON.parse(m[1].trim())); if (r) return r; } catch { /* not valid JSON: next block */ }
  }
  return null;
}

const minutesOf = (iso: unknown) => {
  if (typeof iso !== "string") return 0;
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  return m ? (+(m[1] ?? 0)) * 1440 + (+(m[2] ?? 0)) * 60 + +(m[3] ?? 0) : 0;
};
const servingsOf = (y: unknown) => { const s = Array.isArray(y) ? y.join(" ") : String(y ?? ""); const n = parseInt(s.match(/\d+/)?.[0] ?? "", 10); return n >= 1 && n <= 24 ? n : 4; };

function steps(v: unknown): string[] {
  if (typeof v === "string") return plain(v).split("\n").map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(v)) return v.flatMap(steps);
  if (isObj(v)) {
    if (v.itemListElement) return steps(v.itemListElement);
    if (typeof v.text === "string") return steps(v.text);
    if (typeof v.name === "string" && hasType(v, "HowToStep")) return steps(v.name);
  }
  return [];
}

/* ---- ingredient lines: "1 1/2 cups all-purpose flour, sifted" ---- */
const FRAC: Record<string, string> = { "½": "1/2", "¼": "1/4", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8" };
const UNITS: Record<string, string> = {
  cup: "cup", cups: "cup", c: "cup", tbsp: "tbsp", tbs: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp", tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  g: "g", gram: "g", grams: "g", gr: "g", kg: "kg", kilogram: "kg", kilograms: "kg", ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml", l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
  oz: "oz", ounce: "oz", ounces: "oz", lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
};
const NOUNS = new Set(["clove", "cloves", "slice", "slices", "piece", "pieces", "pinch", "dash", "can", "cans", "tin", "tins", "bunch", "handful", "sprig", "sprigs", "stalk", "stalks", "head", "packet", "package"]);
const NOISE = /\b(fresh|freshly|large|medium|small|big|ripe|raw|extra|virgin|finely|roughly|thinly|coarsely|chopped|diced|minced|sliced|grated|crushed|peeled|cooked|uncooked|boneless|skinless|about|approximately|plus more|to taste|for serving|optional)\b/gi;

export type IngLineParsed = { qty: number | null; unit: string; name: string; note: string };
export function parseIngredientLine(raw: string): IngLineParsed {
  let s = plain(raw).replace(/[½¼¾⅓⅔⅛]/g, (c) => ` ${FRAC[c]}`).replace(/(\d)\s+(\d\/\d)/g, "$1 $2").replace(/\s+/g, " ").trim();
  let paren = ""; s = s.replace(/\(([^)]*)\)/g, (_, p: string) => { paren += ` ${p}`; return " "; }).replace(/\s+/g, " ").trim();
  const [head, ...tail] = s.split(",");
  let rest = head.trim(); const note = tail.join(",").trim();
  let qty: number | null = null;
  const q = rest.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?))?\s*/);
  if (q) {
    const num = (t: string) => { const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/); const fr = t.match(/^(\d+)\/(\d+)$/); return mixed ? +mixed[1] + +mixed[2] / +mixed[3] : fr ? +fr[1] / +fr[2] : parseFloat(t.replace(",", ".")); };
    qty = num(q[1]); rest = rest.slice(q[0].length);
  }
  let unit = "";
  const w = rest.match(/^([a-zA-Z]+)\.?\s*/);
  if (qty != null && w) {
    const k = w[1].toLowerCase();
    if (k in UNITS) { unit = UNITS[k]; rest = rest.slice(w[0].length); }
    else if (NOUNS.has(k)) {
      rest = rest.slice(w[0].length);
      const pm = paren.match(/(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|oz|lb)\b/i);
      if (/^(can|cans|tin|tins|packet|package)$/.test(k) && pm) { qty = qty * parseFloat(pm[1].replace(",", ".")); unit = pm[2].toLowerCase(); }
      else if (/^(clove|cloves|slice|slices|piece|pieces)$/.test(k)) unit = "piece";
      else { unit = k.replace(/s$/, ""); }
    }
  }
  rest = rest.replace(/^of\s+/i, "").replace(NOISE, " ").replace(/[@#~{}]/g, "").replace(/\s+/g, " ").trim();
  return { qty, unit, name: rest, note: note.replace(/[@#~{}()]/g, "").slice(0, 60) };
}

const cook = (l: IngLineParsed) => {
  const ing = matchIngredient(l.name);
  const name = (ing?.names.en[0] ?? l.name).toLowerCase().replace(/[@#~{}]/g, "");
  const optional = /optional/i.test(l.note) ? "(optional)" : "";
  // a bare number with "piece" means whole pieces of the ingredient, which our reader writes as a bare number
  const unit = l.unit === "piece" ? "" : l.unit;
  const qty = l.qty == null ? "" : `${Math.round(l.qty * 100) / 100}${unit ? `%${unit}` : ""}`;
  return { text: `@${name}{${qty}}${optional}`, recognised: !!ing };
};

/** Make one instruction safe for our reader, and turn "simmer 10 minutes" into a timer. */
const step = (s: string) => s.replace(/[@#{}]/g, "").replace(/~/g, "about ")
  .replace(/\b(\d+)(?:\s*(?:to|-|–)\s*\d+)?\s*(?:minutes?|mins?)\b/gi, (_m, n: string) => `~{${n}%minutes}`)
  .replace(/\b(\d+)(?:\s*(?:to|-|–)\s*\d+)?\s*(?:hours?|hrs?)\b/gi, (_m, n: string) => `~{${n}%hours}`).replace(/\s+/g, " ").trim();

export function draftFromHtml(html: string, url: string): Draft | null {
  const r = findRecipeJson(html);
  if (!r) return null;
  const name = plain(String(r.name ?? "")).slice(0, 80) || "Imported recipe";
  const ings = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : []).map((x) => parseIngredientLine(String(x))).filter((l) => l.name)
    .flatMap((l) => (l.qty == null && / and /i.test(l.name) ? l.name.split(/ and /i).map((n) => ({ ...l, name: n.trim() })).filter((x) => x.name) : [l])); // "salt and pepper" is two things
  const st = steps(r.recipeInstructions).map(step).filter(Boolean);
  if (!ings.length || !st.length) return null;
  const cooked = ings.map(cook);
  const total = minutesOf(r.totalTime) || minutesOf(r.cookTime) + minutesOf(r.prepTime) || 30;
  let host = ""; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* keep empty */ }
  const text = [`-- Imported from ${host}. Check the amounts before you rely on the calories.`, `Get everything ready: ${cooked.map((c) => c.text).join(", ")}.`, ...st].join("\n\n");
  return { name, servings: servingsOf(r.recipeYield), minutes: Math.min(720, Math.max(1, total)), text: text.slice(0, 8000), sourceUrl: url, found: { ingredients: ings.length, steps: st.length, recognised: cooked.filter((c) => c.recognised).length } };
}
