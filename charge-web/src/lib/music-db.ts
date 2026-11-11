import "server-only";

import { db } from "@/db";
import { musicLink } from "@/db/schema";
import type { MusicItem } from "@/lib/music";
import { asc, eq } from "drizzle-orm";

/** The person's saved playlist links, in the order they added them. Server pages only: never expose this as a server action (it takes a user id). */
export async function listMusic(userId: string): Promise<MusicItem[]> {
  const rows = await db.select().from(musicLink).where(eq(musicLink.userId, userId)).orderBy(asc(musicLink.position), asc(musicLink.createdAt));
  return rows.map((r) => ({ id: r.id, title: r.title, url: r.url, kind: r.kind as MusicItem["kind"] }));
}
