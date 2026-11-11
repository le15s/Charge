"use server";

import { db } from "@/db";
import { stockItem } from "@/db/schema";
import { stockStatus, todayStr, type StockRow } from "@/lib/stock";
import { requireUser } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const itemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum(["protein", "bar", "supplement", "drink", "other"]),
  unit: z.string().trim().min(1).max(20),
  quantity: z.number().min(0).max(100000),
  perDay: z.number().min(0).max(1000),
  packSize: z.number().min(1).max(100000),
  retailer: z.enum(["amazon", "aliexpress", "alibaba", "other"]),
  productUrl: z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Link must start with http:// or https://").nullable(),
  remindDaysBefore: z.number().int().min(0).max(90),
  repeatEveryDays: z.number().int().min(1).max(365).nullable(),
  nextOrderOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  note: z.string().trim().max(200).nullable(),
});
export type StockInput = z.infer<typeof itemSchema>;
type Res = { ok: true } | { ok: false; error: string };

const revalidate = () => { revalidatePath("/stock"); revalidatePath("/dashboard"); };

export async function addStockItem(raw: unknown): Promise<Res> {
  const user = await requireUser();
  const p = itemSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message === "Required" ? "Fill in the name and the numbers." : p.error.issues[0]?.message ?? "Check the values." };
  const d = p.data;
  await db.insert(stockItem).values({ id: crypto.randomUUID(), userId: user.id, ...d, productUrl: d.productUrl || null, note: d.note || null, nextOrderOn: d.repeatEveryDays ? d.nextOrderOn : null, quantityAt: new Date() });
  revalidate();
  return { ok: true };
}

export async function updateStockItem(id: string, raw: unknown): Promise<Res> {
  const user = await requireUser();
  const p = itemSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the values." };
  const d = p.data;
  await db.update(stockItem).set({ ...d, productUrl: d.productUrl || null, note: d.note || null, nextOrderOn: d.repeatEveryDays ? d.nextOrderOn : null, quantityAt: new Date() }).where(and(eq(stockItem.id, id), eq(stockItem.userId, user.id)));
  revalidate();
  return { ok: true };
}

export async function deleteStockItem(id: string) {
  const user = await requireUser();
  await db.delete(stockItem).where(and(eq(stockItem.id, id), eq(stockItem.userId, user.id)));
  revalidate();
}

/** "My order arrived": adds one pack on top of what is left, and moves the schedule forward. */
export async function restockItem(id: string): Promise<Res> {
  const user = await requireUser();
  const [it] = await db.select().from(stockItem).where(and(eq(stockItem.id, id), eq(stockItem.userId, user.id)));
  if (!it) return { ok: false, error: "Item not found." };
  const st = stockStatus(it as StockRow);
  const next = it.repeatEveryDays ? todayStr(new Date(Date.now() + it.repeatEveryDays * 864e5)) : null;
  await db.update(stockItem).set({ quantity: Math.round((st.left + it.packSize) * 10) / 10, quantityAt: new Date(), nextOrderOn: next }).where(eq(stockItem.id, id));
  revalidate();
  return { ok: true };
}

/** Set the amount you have right now (after counting what's in the cupboard). */
export async function setStockQuantity(id: string, quantity: number): Promise<Res> {
  const user = await requireUser();
  const q = z.number().min(0).max(100000).safeParse(quantity);
  if (!q.success) return { ok: false, error: "Enter a number." };
  await db.update(stockItem).set({ quantity: q.data, quantityAt: new Date() }).where(and(eq(stockItem.id, id), eq(stockItem.userId, user.id)));
  revalidate();
  return { ok: true };
}
