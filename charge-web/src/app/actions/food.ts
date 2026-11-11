"use server";

import { db } from "@/db";
import { bodyWeight, customFood, foodLog, kitchen, menuApplied, menuItem, profile } from "@/db/schema";
import { isLang, nameOf, searchCurated, toEnglishQuery, type Lang } from "@/lib/food-index";
import { pieceFor, type Piece } from "@/lib/pieces";
import { macrosFor, parseQuery, searchFoods } from "@/lib/foods";
import { DEFAULT_EQUIPMENT } from "@/lib/recipes";
import { requireUser } from "@/lib/session";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type FoodHit = { key: string; name: string; sub: string; kcal: number; protein: number; carbs: number; fat: number; servingGrams: number | null; custom: boolean; piece?: Piece | null };
const dayRe = /^\d{4}-\d{2}-\d{2}$/;
const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const round1 = (n: number) => Math.round(n * 10) / 10;

/* ---------- search ---------- */

async function searchAll(userId: string, q: string, lang: Lang): Promise<FoodHit[]> {
  const mine = await db.select().from(customFood).where(eq(customFood.userId, userId));
  const toks = q.toLowerCase().split(/\s+/);
  const own: FoodHit[] = mine.filter((f) => toks.every((t) => f.name.toLowerCase().includes(t))).map((f) => ({ key: `c:${f.id}`, name: f.name, sub: "My food", kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, servingGrams: f.servingGrams, custom: true }));
  const curatedEn = new Map<string, string>();
  const curated: FoodHit[] = searchCurated(q, lang, 12).map((c) => {
    const en = c.names.en[0];
    curatedEn.set(c.key, en);
    const local = cap(nameOf(c, lang));
    return { key: c.key, name: local, sub: lang !== "en" && local !== en ? `${en} · ${c.sub}` : c.sub, kcal: c.kcal, protein: c.protein, carbs: c.carbs, fat: c.fat, servingGrams: c.serving, custom: false };
  });
  const eng = toEnglishQuery(q);
  const open: FoodHit[] = searchFoods(eng ?? q, 25).map((f) => ({ key: `u:${f.id}`, name: f.name, sub: f.category, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, servingGrams: null, custom: false }));
  // "one egg", "one banana": every hit that is a countable food gets its piece, so the sheet can ask "how many?" instead of grams
  for (const h of curated) { const p = pieceFor(h.key.startsWith("i:") ? (curatedEn.get(h.key) ?? h.name) : "", true); if (p) h.piece = h.servingGrams && h.key.startsWith("i:") ? { ...p, g: h.servingGrams } : p; }
  for (const h of open) { const p = pieceFor(h.name); if (p) { h.piece = p; h.servingGrams = p.g; } }
  const seen = new Set<string>();
  return [...own, ...curated, ...open].filter((h) => (seen.has(h.name.toLowerCase()) ? false : (seen.add(h.name.toLowerCase()), true))).slice(0, 30);
}

/** Search your own foods, the world-foods list (8 languages) and the open USDA list. "150g chicken" also gives back the amount. */
export async function searchFood(input: string, lang: string = "en"): Promise<{ hits: FoodHit[]; grams: number | null }> {
  const user = await requireUser();
  const { q, grams } = parseQuery(input.slice(0, 120));
  if (q.length < 2) return { hits: [], grams };
  return { hits: await searchAll(user.id, q, isLang(lang) ? lang : "en"), grams };
}

export type LineGuess = { text: string; hits: FoodHit[]; grams: number };
/** "chicken 150, rice 200g, 2 eggs, banana": turns a typed line into foods with amounts to check, so a whole meal goes in at once. */
export async function resolveLine(text: string, lang: string = "en"): Promise<LineGuess[]> {
  const user = await requireUser();
  const L: Lang = isLang(lang) ? lang : "en";
  const parts = text.slice(0, 600).split(/[,;\n+·]| and | et | y | und | e | ve | و /i).map((s) => s.trim()).filter(Boolean).slice(0, 14);
  const out: LineGuess[] = [];
  for (const part of parts) {
    let { q, grams } = parseQuery(part);
    let count: number | null = null;
    const c = q.match(/^(\d+(?:[.,]\d+)?)\s*(?:x|×)?\s+(.+)$/i);
    if (c && grams === null) { count = parseFloat(c[1].replace(",", ".")); q = c[2].replace(/^(?:slices?|pieces?|pcs|units?|cloves?)\s+(?:of\s+)?/i, ""); }
    const t = q.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)$/);
    if (t && grams === null && count === null) { q = t[1]; grams = parseFloat(t[2].replace(",", ".")); }
    if (q.length < 2) continue;
    const hits = (await searchAll(user.id, q, L)).slice(0, 5);
    const top = hits[0];
    const g = grams ?? (count !== null && (top?.piece?.g ?? top?.servingGrams) ? count * (top!.piece?.g ?? top!.servingGrams!) : count !== null ? count * 100 : top?.servingGrams ?? 100);
    out.push({ text: part, hits, grams: Math.round(g) });
  }
  return out;
}

export async function recentFoods(): Promise<{ name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number; n: number }[]> {
  const user = await requireUser();
  const rows = await db.select().from(foodLog).where(eq(foodLog.userId, user.id)).orderBy(desc(foodLog.createdAt)).limit(300);
  const map = new Map<string, { name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number; n: number }>();
  for (const r of rows) {
    const k = map.get(r.name);
    if (k) k.n++;
    else map.set(r.name, { name: r.name, grams: r.grams, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, n: 1 });
  }
  return [...map.values()].sort((a, b) => b.n - a.n).slice(0, 14);
}

/* ---------- the day, with the set menu dropped in ---------- */

const weekdayBit = (day: string) => 1 << ((new Date(day + "T12:00:00Z").getUTCDay() + 6) % 7);
const notFuture = (day: string) => day <= new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 10);

async function getKitchenRow(userId: string) {
  const [k] = await db.select().from(kitchen).where(eq(kitchen.userId, userId));
  return k ?? null;
}

/** Puts the set menu into a day once. After that the day is yours: delete a food and it stays gone. */
async function ensureApplied(userId: string, day: string) {
  if (!notFuture(day)) return;
  const k = await getKitchenRow(userId);
  if (k && !k.menuOn) return;
  const claimed = await db.insert(menuApplied).values({ id: `${userId}:${day}`, userId, day }).onConflictDoNothing().returning({ id: menuApplied.id });
  if (!claimed.length) return;
  const items = await db.select().from(menuItem).where(and(eq(menuItem.userId, userId), lte(menuItem.since, day)));
  const bit = weekdayBit(day);
  const rows = items.filter((i) => i.days & bit).map((i) => ({ id: crypto.randomUUID(), userId, day, meal: i.meal, name: i.name, grams: i.grams, kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat, menuItemId: i.id }));
  if (rows.length) await db.insert(foodLog).values(rows);
}

export async function getDayLog(day: string) {
  const user = await requireUser();
  if (!dayRe.test(day)) return [];
  await ensureApplied(user.id, day);
  return db.select().from(foodLog).where(and(eq(foodLog.userId, user.id), eq(foodLog.day, day))).orderBy(foodLog.createdAt);
}

const macroShape = z.object({ kcal: z.number().min(0).max(900), protein: z.number().min(0).max(100), carbs: z.number().min(0).max(100), fat: z.number().min(0).max(100) });
const addSchema = z.object({
  day: z.string().regex(dayRe), meal: z.enum(MEALS), name: z.string().trim().min(1).max(120), grams: z.number().min(1).max(5000),
  per100: macroShape,
  repeat: z.boolean().optional(), // also put it in my daily menu
  menuItemId: z.string().max(60).optional(), // restoring a menu food that was skipped
});
export async function addFoodEntry(raw: unknown) {
  const user = await requireUser();
  const p = addSchema.safeParse(raw);
  if (!p.success) return { ok: false as const, error: "Enter an amount between 1 and 5000 g." };
  const m = macrosFor(p.data.per100, p.data.grams);
  let menuItemId = p.data.menuItemId ?? null;
  if (p.data.repeat) {
    await ensureApplied(user.id, p.data.day); // so the new menu food isn't dropped in twice
    menuItemId = crypto.randomUUID();
    await db.insert(menuItem).values({ id: menuItemId, userId: user.id, meal: p.data.meal, name: p.data.name, grams: p.data.grams, ...m, days: 127, since: p.data.day });
  }
  const id = crypto.randomUUID();
  await db.insert(foodLog).values({ id, userId: user.id, day: p.data.day, meal: p.data.meal, name: p.data.name, grams: p.data.grams, ...m, menuItemId });
  revalidatePath("/food");
  return { ok: true as const, id };
}

const manySchema = z.object({
  day: z.string().regex(dayRe), meal: z.enum(MEALS),
  items: z.array(z.object({ name: z.string().trim().min(1).max(120), grams: z.number().min(1).max(5000), per100: macroShape })).min(1).max(20),
  repeat: z.boolean().optional(),
});
/** Several foods at once (the quick line). */
export async function addManyFoods(raw: unknown) {
  const user = await requireUser();
  const p = manySchema.safeParse(raw);
  if (!p.success) return { ok: false as const, error: "Check the amounts." };
  if (p.data.repeat) await ensureApplied(user.id, p.data.day);
  for (const it of p.data.items) {
    const m = macrosFor(it.per100, it.grams);
    let menuItemId: string | null = null;
    if (p.data.repeat) {
      menuItemId = crypto.randomUUID();
      await db.insert(menuItem).values({ id: menuItemId, userId: user.id, meal: p.data.meal, name: it.name, grams: it.grams, ...m, days: 127, since: p.data.day });
    }
    await db.insert(foodLog).values({ id: crypto.randomUUID(), userId: user.id, day: p.data.day, meal: p.data.meal, name: it.name, grams: it.grams, ...m, menuItemId });
  }
  revalidatePath("/food");
  return { ok: true as const };
}

export async function updateFoodGrams(id: string, grams: number) {
  const user = await requireUser();
  const g = z.number().min(1).max(5000).safeParse(grams);
  if (!g.success) return { ok: false as const };
  const [r] = await db.select().from(foodLog).where(and(eq(foodLog.id, id), eq(foodLog.userId, user.id)));
  if (!r) return { ok: false as const };
  const k = g.data / r.grams;
  await db.update(foodLog).set({ grams: g.data, kcal: Math.round(r.kcal * k * 100) / 100, protein: Math.round(r.protein * k * 10) / 10, carbs: Math.round(r.carbs * k * 10) / 10, fat: Math.round(r.fat * k * 10) / 10 }).where(eq(foodLog.id, id));
  revalidatePath("/food");
  return { ok: true as const };
}

export async function deleteFoodEntry(id: string) {
  const user = await requireUser();
  await db.delete(foodLog).where(and(eq(foodLog.id, id), eq(foodLog.userId, user.id)));
  revalidatePath("/food");
}

/** Copy what you ate on one day (or one meal of it) to another day. Skips anything that is already there. */
export async function copyDay(raw: unknown) {
  const user = await requireUser();
  const p = z.object({ from: z.string().regex(dayRe), to: z.string().regex(dayRe), meal: z.enum(MEALS).optional() }).safeParse(raw);
  if (!p.success) return { ok: false as const, count: 0 };
  await ensureApplied(user.id, p.data.from);
  await ensureApplied(user.id, p.data.to);
  const src = await db.select().from(foodLog).where(and(eq(foodLog.userId, user.id), eq(foodLog.day, p.data.from)));
  const dst = await db.select().from(foodLog).where(and(eq(foodLog.userId, user.id), eq(foodLog.day, p.data.to)));
  const have = new Set(dst.map((r) => `${r.meal}|${r.name}|${r.grams}`));
  const rows = src.filter((r) => (!p.data.meal || r.meal === p.data.meal) && !have.has(`${r.meal}|${r.name}|${r.grams}`));
  for (const r of rows) await db.insert(foodLog).values({ id: crypto.randomUUID(), userId: user.id, day: p.data.to, meal: r.meal, name: r.name, grams: r.grams, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat });
  revalidatePath("/food");
  return { ok: true as const, count: rows.length };
}

/* ---------- the set menu ---------- */

export type MenuRow = { id: string; meal: string; name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number; days: number };
export async function getMenu(): Promise<{ on: boolean; items: MenuRow[] }> {
  const user = await requireUser();
  const [k, items] = await Promise.all([getKitchenRow(user.id), db.select().from(menuItem).where(eq(menuItem.userId, user.id)).orderBy(menuItem.createdAt)]);
  return { on: k ? k.menuOn : true, items: items.map((i) => ({ id: i.id, meal: i.meal, name: i.name, grams: i.grams, kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat, days: i.days })) };
}

/** Stop a menu food: from today on it is gone. Past days keep what you logged. */
export async function removeMenuItem(id: string, day?: string) {
  const user = await requireUser();
  await db.delete(menuItem).where(and(eq(menuItem.id, id), eq(menuItem.userId, user.id)));
  if (day && dayRe.test(day)) await db.delete(foodLog).where(and(eq(foodLog.userId, user.id), eq(foodLog.day, day), eq(foodLog.menuItemId, id)));
  revalidatePath("/food");
}

export async function updateMenuItem(raw: unknown) {
  const user = await requireUser();
  const p = z.object({ id: z.string(), grams: z.number().min(1).max(5000).optional(), days: z.number().int().min(1).max(127).optional(), meal: z.enum(MEALS).optional() }).safeParse(raw);
  if (!p.success) return { ok: false as const };
  const [r] = await db.select().from(menuItem).where(and(eq(menuItem.id, p.data.id), eq(menuItem.userId, user.id)));
  if (!r) return { ok: false as const };
  const set: Partial<typeof menuItem.$inferInsert> = {};
  if (p.data.grams) { const k = p.data.grams / r.grams; Object.assign(set, { grams: p.data.grams, kcal: Math.round(r.kcal * k * 100) / 100, protein: round1(r.protein * k), carbs: round1(r.carbs * k), fat: round1(r.fat * k) }); }
  if (p.data.days) set.days = p.data.days;
  if (p.data.meal) set.meal = p.data.meal;
  await db.update(menuItem).set(set).where(eq(menuItem.id, r.id));
  return { ok: true as const };
}

/** Turn what is in this day's log into the set menu. Handy for starting out. */
export async function saveDayAsMenu(day: string) {
  const user = await requireUser();
  if (!dayRe.test(day)) return { ok: false as const, count: 0 };
  const rows = await db.select().from(foodLog).where(and(eq(foodLog.userId, user.id), eq(foodLog.day, day)));
  const existing = await db.select().from(menuItem).where(eq(menuItem.userId, user.id));
  const have = new Set(existing.map((e) => `${e.meal}|${e.name}`));
  let count = 0;
  for (const r of rows) {
    if (r.menuItemId || have.has(`${r.meal}|${r.name}`)) continue;
    const id = crypto.randomUUID();
    await db.insert(menuItem).values({ id, userId: user.id, meal: r.meal, name: r.name, grams: r.grams, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, days: 127, since: day });
    await db.update(foodLog).set({ menuItemId: id }).where(eq(foodLog.id, r.id));
    count++;
  }
  revalidatePath("/food");
  return { ok: true as const, count };
}

export async function setMenuOn(on: boolean) {
  const user = await requireUser();
  await db.insert(kitchen).values({ userId: user.id, menuOn: on }).onConflictDoUpdate({ target: kitchen.userId, set: { menuOn: on } });
  revalidatePath("/food");
}

/** Add a food to the menu without logging it today (the My menu tab). If today is already filled in, it also lands in today. */
export async function addMenuFood(raw: unknown) {
  const user = await requireUser();
  const p = z.object({ day: z.string().regex(dayRe), meal: z.enum(MEALS), name: z.string().trim().min(1).max(120), grams: z.number().min(1).max(5000), per100: macroShape, days: z.number().int().min(1).max(127).default(127) }).safeParse(raw);
  if (!p.success) return { ok: false as const, error: "Check the amount." };
  await ensureApplied(user.id, p.data.day);
  const m = macrosFor(p.data.per100, p.data.grams);
  const id = crypto.randomUUID();
  await db.insert(menuItem).values({ id, userId: user.id, meal: p.data.meal, name: p.data.name, grams: p.data.grams, ...m, days: p.data.days, since: p.data.day });
  if (p.data.days & weekdayBit(p.data.day)) await db.insert(foodLog).values({ id: crypto.randomUUID(), userId: user.id, day: p.data.day, meal: p.data.meal, name: p.data.name, grams: p.data.grams, ...m, menuItemId: id });
  revalidatePath("/food");
  return { ok: true as const };
}

/* ---------- custom foods ---------- */

const customSchema = z.object({
  name: z.string().trim().min(1).max(80), kcal: z.number().min(0).max(900), protein: z.number().min(0).max(100), carbs: z.number().min(0).max(100), fat: z.number().min(0).max(100),
  servingGrams: z.number().min(1).max(2000).nullable(),
  barcode: z.string().regex(/^\d{8,14}$/).optional(), source: z.enum(["off"]).optional(),
});
/** Save a food of your own. Values are per 100 g, as printed on the label. */
export async function createCustomFood(raw: unknown) {
  const user = await requireUser();
  const p = customSchema.safeParse(raw);
  if (!p.success) return { ok: false as const, error: "Check the name and the numbers (per 100 g)." };
  const id = crypto.randomUUID();
  await db.insert(customFood).values({ id, userId: user.id, ...p.data });
  return { ok: true as const, hit: { key: `c:${id}`, name: p.data.name, sub: "My food", kcal: p.data.kcal, protein: p.data.protein, carbs: p.data.carbs, fat: p.data.fat, servingGrams: p.data.servingGrams, custom: true } satisfies FoodHit };
}

/* ---------- barcode (Open Food Facts) ---------- */

export type Scanned = { barcode: string; name: string; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null; servingGrams: number | null };
type OffNutriments = Record<string, number | string | undefined>;
const num = (v: unknown) => { const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN; return Number.isFinite(n) ? n : null; };
const r1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);

/**
 * Look a barcode up: first among foods you already saved, then on Open Food Facts (open database, ODbL licence, needs credit).
 * Nothing is saved here. The sheet shows the numbers for you to check, then saves them with createCustomFood.
 */
export async function lookupBarcode(raw: string): Promise<
  | { ok: true; found: "mine"; hit: FoodHit }
  | { ok: true; found: "off"; product: Scanned }
  | { ok: false; reason: "invalid" | "notfound" | "offline" }
> {
  const user = await requireUser();
  const code = String(raw ?? "").replace(/\D/g, "");
  if (code.length < 8 || code.length > 14) return { ok: false, reason: "invalid" };
  const [mine] = await db.select().from(customFood).where(and(eq(customFood.userId, user.id), eq(customFood.barcode, code))).limit(1);
  if (mine) return { ok: true, found: "mine", hit: { key: `c:${mine.id}`, name: mine.name, sub: "My food", kcal: mine.kcal, protein: mine.protein, carbs: mine.carbs, fat: mine.fat, servingGrams: mine.servingGrams, custom: true } };
  const base = process.env.OFF_URL || "https://world.openfoodfacts.org";
  try {
    const res = await fetch(`${base}/api/v2/product/${code}.json?fields=code,product_name,brands,nutriments,serving_quantity`, {
      headers: { "User-Agent": `Charge/1.0 (fitness tracker; barcode lookup; ${process.env.CONTACT_URL ?? "self-hosted"})` }, signal: AbortSignal.timeout(8000), cache: "no-store",
    });
    if (res.status === 404) return { ok: false, reason: "notfound" };
    if (!res.ok) return { ok: false, reason: "offline" };
    const j = (await res.json()) as { status?: number; product?: { product_name?: string; brands?: string; nutriments?: OffNutriments; serving_quantity?: number | string } };
    if (j.status !== 1 || !j.product) return { ok: false, reason: "notfound" };
    const n = j.product.nutriments ?? {};
    const kj = num(n["energy_100g"]);
    const kcal = num(n["energy-kcal_100g"]) ?? (kj != null ? kj / 4.184 : null);
    const brand = (j.product.brands ?? "").split(",")[0].trim();
    const title = (j.product.product_name ?? "").trim();
    const name = [title || "Unnamed product", brand && !title.toLowerCase().includes(brand.toLowerCase()) ? `(${brand})` : ""].filter(Boolean).join(" ").slice(0, 80);
    const sv = num(j.product.serving_quantity);
    return { ok: true, found: "off", product: { barcode: code, name, kcal: r1(kcal), protein: r1(num(n["proteins_100g"])), carbs: r1(num(n["carbohydrates_100g"])), fat: r1(num(n["fat_100g"])), servingGrams: sv && sv >= 1 && sv <= 2000 ? r1(sv) : null } };
  } catch {
    return { ok: false, reason: "offline" };
  }
}

/* ---------- kitchen (equipment, spices, language) ---------- */

export type KitchenPrefs = { equipment: string[]; haveSpices: string[]; noSpices: string[]; foodLang: Lang; menuOn: boolean };
const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
export async function getKitchen(): Promise<KitchenPrefs> {
  const user = await requireUser();
  const k = await getKitchenRow(user.id);
  return k
    ? { equipment: csv(k.equipment), haveSpices: csv(k.haveSpices), noSpices: csv(k.noSpices), foodLang: isLang(k.foodLang) ? k.foodLang : "en", menuOn: k.menuOn }
    : { equipment: DEFAULT_EQUIPMENT, haveSpices: [], noSpices: [], foodLang: "en", menuOn: true };
}

const idList = z.array(z.string().regex(/^[a-z0-9'-]+$/).max(40)).max(120);
export async function saveKitchen(raw: unknown) {
  const user = await requireUser();
  const p = z.object({ equipment: idList.optional(), haveSpices: idList.optional(), noSpices: idList.optional(), foodLang: z.string().optional() }).safeParse(raw);
  if (!p.success) return { ok: false as const };
  const set: Partial<typeof kitchen.$inferInsert> = {};
  if (p.data.equipment) set.equipment = p.data.equipment.join(",");
  if (p.data.haveSpices) set.haveSpices = p.data.haveSpices.join(",");
  if (p.data.noSpices) set.noSpices = p.data.noSpices.join(",");
  if (p.data.foodLang && isLang(p.data.foodLang)) set.foodLang = p.data.foodLang;
  await db.insert(kitchen).values({ userId: user.id, ...set }).onConflictDoUpdate({ target: kitchen.userId, set });
  return { ok: true as const };
}

void gte;

/** The last seven days of totals and the recent weigh-ins, for the weekly review on the Food page. The page works the review out itself (src/lib/analyze-food.ts). */
export async function getFoodWeek(day: string) {
  const user = await requireUser();
  if (!dayRe.test(day)) return { days: [], weights: [], goalWeightKg: null as number | null };
  const end = new Date(day + "T12:00:00Z");
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const from = iso(new Date(end.getTime() - 6 * 864e5)), wFrom = iso(new Date(end.getTime() - 35 * 864e5));
  const rows = await db.select({ day: foodLog.day, kcal: sql<number>`sum(${foodLog.kcal})`, protein: sql<number>`sum(${foodLog.protein})`, n: sql<number>`count(*)` }).from(foodLog)
    .where(and(eq(foodLog.userId, user.id), gte(foodLog.day, from), lte(foodLog.day, day))).groupBy(foodLog.day);
  const by = new Map(rows.map((r) => [r.day, r]));
  const days = Array.from({ length: 7 }, (_, i) => { const d = iso(new Date(end.getTime() - (6 - i) * 864e5)); const r = by.get(d); return { day: d, kcal: Math.round(r?.kcal ?? 0), protein: Math.round(r?.protein ?? 0), logged: !!r?.n }; });
  const w = await db.select({ day: bodyWeight.day, kg: bodyWeight.weightKg }).from(bodyWeight).where(and(eq(bodyWeight.userId, user.id), gte(bodyWeight.day, wFrom), lte(bodyWeight.day, day))).orderBy(bodyWeight.day);
  const [pr] = await db.select({ g: profile.goalWeightKg }).from(profile).where(eq(profile.userId, user.id));
  return { days, weights: w.map((x) => ({ day: x.day, kg: x.kg })), goalWeightKg: pr?.g ?? null };
}
