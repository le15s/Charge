import INGREDIENT_ROWS from "@/data/ingredients";
import WORLD_ROWS from "@/data/worldfoods";

/** The languages food names and search work in. The rest of the interface stays English. */
export const LANGS = [
  { id: "en", label: "English", native: "English" },
  { id: "fr", label: "French", native: "Français" },
  { id: "es", label: "Spanish", native: "Español" },
  { id: "ar", label: "Arabic", native: "العربية" },
  { id: "de", label: "German", native: "Deutsch" },
  { id: "it", label: "Italian", native: "Italiano" },
  { id: "pt", label: "Portuguese", native: "Português" },
  { id: "tr", label: "Turkish", native: "Türkçe" },
] as const;
export type Lang = (typeof LANGS)[number]["id"];
export const LANG_IDS = LANGS.map((l) => l.id) as Lang[];
export const isLang = (s: unknown): s is Lang => typeof s === "string" && (LANG_IDS as string[]).includes(s);

/** Lower-case, no accents, Arabic marks and Turkish dotless i folded, so "Poulet", "POULET" and "poúlet" all match. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, "i").replace(/ß/g, "ss").replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/ø/g, "o")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[ً-ْٰـ]/g, "") // Arabic diacritics and tatweel
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/['’`´]/g, "")
    .replace(/\s+/g, " ").trim();
}
export const tokens = (s: string) => norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

type Names = Record<Lang, string[]>;
const emptyNames = (): Names => ({ en: [], fr: [], es: [], ar: [], de: [], it: [], pt: [], tr: [] });
const splitNames = (s: string) => s.split("/").map((x) => x.trim()).filter(Boolean);

export type Ingredient = {
  id: string; cat: string; kcal: number; protein: number; carbs: number; fat: number; piece: number; flags: string;
  names: Names;
};
export type WorldFood = {
  id: string; origin: string; kcal: number; protein: number; carbs: number; fat: number; serving: number; names: Names;
};

const rows = (src: string) => src.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

export const INGREDIENTS: Ingredient[] = rows(INGREDIENT_ROWS).map((l) => {
  const p = l.split("|");
  const names = emptyNames();
  LANG_IDS.forEach((lg, i) => { names[lg] = splitNames(p[8 + i] ?? ""); });
  return { id: p[0], cat: p[1], kcal: +p[2], protein: +p[3], carbs: +p[4], fat: +p[5], piece: +p[6], flags: p[7] === "-" ? "" : p[7], names };
});
export const ING_BY_ID = new Map(INGREDIENTS.map((i) => [i.id, i]));

export const WORLD_FOODS: WorldFood[] = rows(WORLD_ROWS).map((l, n) => {
  const p = l.split("|");
  const names = emptyNames();
  const en = splitNames(p[0]);
  LANG_IDS.forEach((lg, i) => { const v = splitNames(p[i] ?? ""); names[lg] = v.length ? v : en; });
  return { id: `w${n}`, origin: p[8], kcal: +p[9], protein: +p[10], carbs: +p[11], fat: +p[12], serving: +p[13], names };
});

/** Name to show for a given language, falling back to English. */
export const nameOf = (x: { names: Names }, lang: Lang) => x.names[lang][0] ?? x.names.en[0];

/** All single-word names -> English word, so "poulet", "pollo" and "tavuk" can also find USDA rows that are only in English. */
const BRIDGE = (() => {
  const m = new Map<string, string>();
  for (const ing of INGREDIENTS) {
    const en = ing.names.en[0];
    if (!en || /[\s(]/.test(en)) continue;
    for (const lg of LANG_IDS) for (const n of ing.names[lg]) { const t = norm(n); if (t && !/\s/.test(t) && t !== norm(en)) m.set(t, en.toLowerCase()); }
  }
  return m;
})();
/** Query words turned into English where we know the word; null when nothing changed. */
const EXTRA_BRIDGE: Record<string, string> = Object.fromEntries(
  Object.entries({
    chicken: "poulet pollo دجاج hahnchen huhn frango tavuk", beef: "boeuf ternera res بقر rind manzo vaca dana sigir", pork: "porc cerdo خنزير schwein maiale porco domuz",
    lamb: "agneau cordero ضان lamm agnello cordeiro kuzu", turkey: "dinde pavo pute tacchino peru hindi", fish: "poisson pescado سمك fisch pesce peixe balik",
    cheese: "fromage queso جبن kase formaggio queijo peynir", oil: "huile aceite زيت olio oleo yag", soup: "soupe sopa شوربة suppe zuppa corba",
    salad: "salade ensalada سلطة salat insalata salada salata", cake: "gateau pastel tarta كعكة kuchen torta bolo kek", beans: "haricots frijoles judias فاصوليا bohnen fagioli feijao fasulye",
    sausage: "saucisse salchicha سجق wurst salsiccia salsicha sosis", steak: "bistec bifteck bife biftek ستيك", fried: "frit frito مقلي gebraten fritto kizartma",
    ham: "jambon jamon لحم الخنزير schinken prosciutto presunto", cream: "creme nata كريمة sahne panna krema", juice: "jus zumo عصير saft succo sumo meyve suyu",
    soup2: "", sandwich: "sandwich bocadillo ساندويتش belegtes panino sanduiche", pizza: "pizza بيتزا", noodle: "nouilles fideos شعيرية nudeln noodles talharim erişte eriste", nuts: "noix frutos secos مكسرات nusse noci nozes kuruyemis",
  }).map(([k, v]) => [k, v] as const),
);
for (const [en, words] of Object.entries(EXTRA_BRIDGE)) for (const w of words.split(" ").filter(Boolean)) BRIDGE.set(norm(w), en.replace(/\d$/, ""));

export function toEnglishQuery(q: string): string | null {
  const ts = tokens(q);
  let changed = false;
  const out = ts.map((t) => { const e = BRIDGE.get(t); if (e) { changed = true; return e; } return t; });
  return changed ? out.join(" ") : null;
}

export type CuratedHit = { key: string; kind: "ing" | "world"; names: Names; sub: string; kcal: number; protein: number; carbs: number; fat: number; serving: number | null; score: number };

function scoreNames(names: Names, toks: string[]): number {
  let best = -1;
  for (const lg of LANG_IDS) {
    for (const nm of names[lg]) {
      const n = norm(nm);
      let s = 0, ok = true;
      for (const t0 of toks) {
        // plural forms: "oeufs", "huevos", "eggs"
        let t = t0;
        let i = n.indexOf(t);
        if (i < 0 && t.length > 3 && /[sx]$/.test(t)) { t = t.slice(0, -1); i = n.indexOf(t); }
        if (i < 0 && t0.length > 4 && /es$/.test(t0)) { t = t0.slice(0, -2); i = n.indexOf(t); }
        if (i < 0) { ok = false; break; }
        const ws = i === 0 || /[^\p{L}\p{N}]/u.test(n[i - 1]);
        s += ws ? 10 : 3;
        if (i === 0) s += 8;
        if (n === t) s += 12;
        // the whole word, not the start of a longer one: "egg" finds egg white before eggplant
        if (ws && !/\p{L}/u.test(n.slice(i + t.length).replace(/^(es|s)(?![\p{L}])/u, "")[0] ?? "")) s += 6;
      }
      if (!ok) continue;
      s -= n.length * 0.1;
      if (s > best) best = s;
    }
  }
  return best;
}

const CATEGORY_LABEL: Record<string, string> = { meat: "Meat", fish: "Fish and seafood", egg: "Eggs", dairy: "Dairy", fat: "Oils and fats", veg: "Vegetables", fruit: "Fruit", grain: "Grains and bread", legume: "Legumes and soy", nut: "Nuts and seeds", sauce: "Sauces and pantry", sweet: "Sweet", spice: "Spices", herb: "Herbs", other: "Other" };

/** Search the hand-written ingredient list and the world dishes, in any of the 8 languages. */
export function searchCurated(query: string, lang: Lang, limit = 14): CuratedHit[] {
  const toks = tokens(query);
  if (!toks.length) return [];
  // "boiled", "fried"... say how it is cooked, not what it is: let the common foods lead instead of an odd dish that happens to say boiled
  if (toks.every((t) => /^(boiled|fried|grilled|baked|roasted|steamed|raw|cooked|fresh|canned|frozen|dried|smoked|poached|stewed)$/.test(t))) return [];
  const out: CuratedHit[] = [];
  for (const i of INGREDIENTS) {
    if (i.cat === "other" && i.id === "water") continue;
    const s = scoreNames(i.names, toks);
    if (s < 0) continue;
    out.push({ key: `i:${i.id}`, kind: "ing", names: i.names, sub: CATEGORY_LABEL[i.cat] ?? i.cat, kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat, serving: i.piece > 0 ? i.piece : null, score: s + 18 });
  }
  for (const w of WORLD_FOODS) {
    const s = scoreNames(w.names, toks);
    if (s < 0) continue;
    out.push({ key: `w:${w.id}`, kind: "world", names: w.names, sub: w.origin, kcal: w.kcal, protein: w.protein, carbs: w.carbs, fat: w.fat, serving: w.serving, score: s + 6 });
  }
  void lang;
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Resolve free text (any language) to ingredient ids. Used by the recipe finder. */
export function findIngredients(query: string, limit = 8): Ingredient[] {
  const toks = tokens(query);
  if (!toks.length) return [];
  return INGREDIENTS
    .map((i) => ({ i, s: scoreNames(i.names, toks) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.i);
}
