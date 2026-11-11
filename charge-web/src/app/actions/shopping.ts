"use server";

import { db } from "@/db";
import { shoppingItem } from "@/db/schema";
import { AISLES, aisleFor } from "@/lib/aisles";
import { ING_BY_ID, findIngredients } from "@/lib/food-index";
import { requireUser } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export type ShopRow = { id: string; ingredientId: string | null; name: string; grams: number | null; aisle: string; note: string | null; checked: boolean };

const rows = async (userId: string): Promise<ShopRow[]> =>
  (await db.select().from(shoppingItem).where(eq(shoppingItem.userId, userId)).orderBy(shoppingItem.createdAt)).map((r) => ({ id: r.id, ingredientId: r.ingredientId, name: r.name, grams: r.grams, aisle: r.aisle, note: r.note, checked: r.checked }));

export async function getShopping(): Promise<ShopRow[]> {
  const user = await requireUser();
  return rows(user.id);
}
export async function shoppingCount(): Promise<number> {
  const user = await requireUser();
  return (await rows(user.id)).filter((r) => !r.checked).length;
}

const itemSchema = z.object({
  ingredientId: z.string().max(40).nullable().optional(), name: z.string().trim().min(1).max(80),
  grams: z.number().min(0).max(100000).nullable().optional(), note: z.string().trim().max(80).nullable().optional(),
});
/** Add things to buy. A thing already on the list (not ticked yet) gets its amount added instead of a second line. */
export async function addShopping(raw: unknown) {
  const user = await requireUser();
  const p = z.array(itemSchema).min(1).max(60).safeParse(raw);
  if (!p.success) return { ok: false as const, added: 0 };
  const existing = await rows(user.id);
  let added = 0;
  for (const it of p.data) {
    const ing = it.ingredientId ? ING_BY_ID.get(it.ingredientId) : undefined;
    const aisle = aisleFor(ing?.cat);
    const dup = ing ? existing.find((e) => e.ingredientId === ing.id && !e.checked) : existing.find((e) => !e.checked && !e.ingredientId && e.name.toLowerCase() === it.name.toLowerCase());
    if (dup) {
      if (it.grams != null) await db.update(shoppingItem).set({ grams: (dup.grams ?? 0) + it.grams, note: dup.note && it.note && !dup.note.includes(it.note) ? `${dup.note}, ${it.note}`.slice(0, 80) : dup.note ?? it.note ?? null }).where(and(eq(shoppingItem.id, dup.id), eq(shoppingItem.userId, user.id)));
      dup.grams = (dup.grams ?? 0) + (it.grams ?? 0);
      continue;
    }
    const id = crypto.randomUUID();
    await db.insert(shoppingItem).values({ id, userId: user.id, ingredientId: ing?.id ?? null, name: it.name, grams: it.grams ?? null, aisle, note: it.note ?? null });
    existing.push({ id, ingredientId: ing?.id ?? null, name: it.name, grams: it.grams ?? null, aisle, note: it.note ?? null, checked: false });
    added++;
  }
  return { ok: true as const, added };
}

/** Type "eggs" or "poulet" and it is matched to the ingredient list (so it lands in the right aisle). */
export async function addShoppingText(text: string, lang = "en") {
  const parts = text.split(/[,;\n]/).map((s) => s.trim()).filter((s) => s.length >= 2).slice(0, 20);
  void lang;
  const items = parts.map((t) => { const m = findIngredients(t, 1)[0]; return m ? { ingredientId: m.id, name: m.names.en[0].charAt(0).toUpperCase() + m.names.en[0].slice(1), grams: null } : { ingredientId: null, name: t.charAt(0).toUpperCase() + t.slice(1), grams: null }; });
  if (!items.length) return { ok: false as const, added: 0 };
  return addShopping(items);
}

export async function toggleShopping(id: string, checked: boolean) {
  const user = await requireUser();
  await db.update(shoppingItem).set({ checked }).where(and(eq(shoppingItem.id, id), eq(shoppingItem.userId, user.id)));
}
export async function removeShopping(id: string) {
  const user = await requireUser();
  await db.delete(shoppingItem).where(and(eq(shoppingItem.id, id), eq(shoppingItem.userId, user.id)));
}
export async function clearShopping(onlyChecked: boolean) {
  const user = await requireUser();
  await db.delete(shoppingItem).where(onlyChecked ? and(eq(shoppingItem.userId, user.id), eq(shoppingItem.checked, true)) : eq(shoppingItem.userId, user.id));
}

void AISLES;
