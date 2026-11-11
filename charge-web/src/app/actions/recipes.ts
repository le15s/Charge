"use server";

import { db } from "@/db";
import { userRecipe } from "@/db/schema";
import { requireUser } from "@/lib/session";
import type { MyRecipe } from "@/lib/cooklang";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { draftFromHtml } from "@/lib/recipe-import";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const schema = z.object({
  id: z.string().max(60).optional(),
  name: z.string().trim().min(1).max(80),
  servings: z.number().int().min(1).max(24),
  minutes: z.number().int().min(1).max(720),
  meals: z.string().regex(/^[bld s]*$/).max(4),
  text: z.string().trim().min(1).max(8000),
  sourceUrl: z.string().url().max(500).nullish(),
});

export async function listMyRecipes(): Promise<(MyRecipe & { sourceUrl: string | null })[]> {
  const user = await requireUser();
  const rows = await db.select().from(userRecipe).where(eq(userRecipe.userId, user.id)).orderBy(desc(userRecipe.updatedAt));
  return rows.map((r) => ({ id: r.id, name: r.name, servings: r.servings, minutes: r.minutes, meals: r.meals, text: r.text, sourceUrl: r.sourceUrl }));
}

export async function saveMyRecipe(raw: unknown) {
  const user = await requireUser();
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false as const, error: "Give it a name, a servings number and some text." };
  const d = p.data;
  if (d.id) {
    const res = await db.update(userRecipe).set({ name: d.name, servings: d.servings, minutes: d.minutes, meals: d.meals.replace(/\s/g, ""), text: d.text, updatedAt: new Date() }).where(and(eq(userRecipe.id, d.id), eq(userRecipe.userId, user.id)));
    if (!res.rowsAffected) return { ok: false as const, error: "That recipe is gone." };
    return { ok: true as const, id: d.id };
  }
  const count = (await db.select({ id: userRecipe.id }).from(userRecipe).where(eq(userRecipe.userId, user.id))).length;
  if (count >= 200) return { ok: false as const, error: "That's a lot of recipes. Delete a few first." };
  const id = crypto.randomUUID();
  await db.insert(userRecipe).values({ id, userId: user.id, name: d.name, servings: d.servings, minutes: d.minutes, meals: d.meals.replace(/\s/g, ""), text: d.text, sourceUrl: d.sourceUrl ?? null });
  return { ok: true as const, id };
}

export async function deleteMyRecipe(id: string) {
  const user = await requireUser();
  await db.delete(userRecipe).where(and(eq(userRecipe.id, id), eq(userRecipe.userId, user.id)));
  return { ok: true as const };
}

/* ---------- import from a web page ---------- */

const privateIp = (ip: string) => {
  if (isIP(ip) === 6) { const l = ip.toLowerCase(); return l === "::1" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80") || l.startsWith("::ffff:127.") || l.startsWith("::ffff:10.") || l.startsWith("::ffff:192.168.") || l === "::"; }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
};
/** Only public web pages: no local or private addresses, no odd ports. (ALLOW_PRIVATE_FETCH=1 turns the address check off for local testing.) */
async function safeUrl(raw: string) {
  const u = new URL(raw);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("scheme");
  if (u.username || u.password) throw new Error("credentials");
  if (process.env.ALLOW_PRIVATE_FETCH === "1") return u;
  if (u.port && u.port !== "80" && u.port !== "443") throw new Error("port");
  const addrs = isIP(u.hostname) ? [{ address: u.hostname }] : await lookup(u.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) throw new Error("private");
  return u;
}

export async function importRecipe(rawUrl: string): Promise<{ ok: true; draft: NonNullable<ReturnType<typeof draftFromHtml>> } | { ok: false; error: string }> {
  await requireUser();
  let url: URL;
  try { url = new URL(String(rawUrl).trim()); await safeUrl(url.href); } catch { return { ok: false, error: "That doesn't look like a public web link. Paste the full address, starting with https://" }; }
  try {
    let html = "";
    for (let hop = 0; hop < 4; hop++) {
      await safeUrl(url.href);
      const res = await fetch(url, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (compatible; ChargeRecipeImport/1.0)", Accept: "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(9000), cache: "no-store" });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) { url = new URL(res.headers.get("location")!, url); continue; }
      if (!res.ok) return { ok: false, error: `The site answered with an error (${res.status}). Try another link.` };
      const len = Number(res.headers.get("content-length") ?? 0);
      if (len > 3_000_000) return { ok: false, error: "That page is too big to read." };
      html = (await res.text()).slice(0, 3_000_000);
      break;
    }
    if (!html) return { ok: false, error: "Couldn't open that page." };
    const draft = draftFromHtml(html, url.href);
    if (!draft) return { ok: false, error: "We couldn't find a recipe on that page. It may not publish its recipe in a readable way. You can still type it in yourself." };
    return { ok: true, draft };
  } catch {
    return { ok: false, error: "Couldn't reach that page. Check the link and try again." };
  }
}
