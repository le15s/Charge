"use server";

import { db } from "@/db";
import { musicLink } from "@/db/schema";
import { defaultTitle, MAX_MUSIC_LINKS, parseMusicUrl } from "@/lib/music";
import { requireUser } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type Res = { ok: true } | { ok: false; error: string };
const input = z.object({ title: z.string().trim().max(40), url: z.string().max(600) });

export async function addMusicLink(raw: unknown): Promise<Res> {
  const user = await requireUser();
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, error: "Check the name (40 characters at most) and the link." };
  const parsed = parseMusicUrl(p.data.url);
  if (!parsed.ok) return parsed;
  const mine = await db.select({ id: musicLink.id, url: musicLink.url, position: musicLink.position }).from(musicLink).where(eq(musicLink.userId, user.id));
  if (mine.length >= MAX_MUSIC_LINKS) return { ok: false, error: `You can keep up to ${MAX_MUSIC_LINKS} links. Remove one first.` };
  if (mine.some((m) => m.url === parsed.url)) return { ok: false, error: "You already saved that link." };
  const position = mine.reduce((a, m) => Math.max(a, m.position), -1) + 1;
  await db.insert(musicLink).values({ id: crypto.randomUUID(), userId: user.id, title: p.data.title || defaultTitle(parsed.kind), url: parsed.url, kind: parsed.kind, position });
  revalidatePath("/settings"); revalidatePath("/workout/[id]", "page");
  return { ok: true };
}

export async function removeMusicLink(id: string): Promise<Res> {
  const user = await requireUser();
  await db.delete(musicLink).where(and(eq(musicLink.id, id), eq(musicLink.userId, user.id)));
  revalidatePath("/settings"); revalidatePath("/workout/[id]", "page");
  return { ok: true };
}
