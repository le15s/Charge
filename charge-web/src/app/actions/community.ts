"use server";

import { db } from "@/db";
import { communityPost, communityReport } from "@/db/schema";
import { MAX_POST, roomById } from "@/lib/community";
import { getProfile, requireUser } from "@/lib/session";
import { and, asc, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";

export type Post = { id: string; author: string; body: string; at: number; mine: boolean; canDelete: boolean; reply: { author: string; body: string } | null };

const isAdmin = (email: string) => (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
const HIDE_AT = 3; // posts reported by this many people are hidden

async function shape(rows: (typeof communityPost.$inferSelect)[], me: { id: string; email: string }): Promise<Post[]> {
  const ids = [...new Set(rows.map((r) => r.replyToId).filter((x): x is string => !!x))];
  const parents = ids.length ? await db.select().from(communityPost).where(inArray(communityPost.id, ids)) : [];
  const pm = new Map(parents.map((p) => [p.id, p]));
  const admin = isAdmin(me.email);
  return rows.filter((r) => r.reports < HIDE_AT || r.userId === me.id).map((r) => {
    const p = r.replyToId ? pm.get(r.replyToId) : null;
    return { id: r.id, author: r.authorName, body: r.body, at: r.createdAt.getTime(), mine: r.userId === me.id, canDelete: r.userId === me.id || admin, reply: p ? { author: p.authorName, body: p.body.slice(0, 120) } : null };
  });
}

/** Newest 50 posts of a room (oldest first), or older/newer ones relative to a timestamp. */
export async function listPosts(room: string, opts?: { before?: number; after?: number }): Promise<{ posts: Post[]; more: boolean }> {
  const user = await requireUser();
  if (!roomById(room)) return { posts: [], more: false };
  const where = opts?.after ? and(eq(communityPost.room, room), gt(communityPost.createdAt, new Date(opts.after))) : opts?.before ? and(eq(communityPost.room, room), lt(communityPost.createdAt, new Date(opts.before))) : eq(communityPost.room, room);
  const rows = opts?.after ? await db.select().from(communityPost).where(where).orderBy(asc(communityPost.createdAt)).limit(100) : await db.select().from(communityPost).where(where).orderBy(desc(communityPost.createdAt)).limit(51);
  const more = !opts?.after && rows.length > 50;
  const slice = opts?.after ? rows : rows.slice(0, 50).reverse();
  return { posts: await shape(slice, user), more };
}

export async function createPost(room: string, body: string, replyToId?: string | null): Promise<{ ok: true; post: Post } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!roomById(room)) return { ok: false, error: "That room doesn't exist." };
  const p = z.string().trim().min(1).max(MAX_POST).safeParse(body);
  if (!p.success) return { ok: false, error: `Write something (up to ${MAX_POST} characters).` };
  const prof = await getProfile(user.id);
  const name = prof.displayName ?? user.name;
  const recent = await db.select({ n: sql<number>`count(*)` }).from(communityPost).where(and(eq(communityPost.userId, user.id), gt(communityPost.createdAt, new Date(Date.now() - 30_000))));
  if ((recent[0]?.n ?? 0) >= 5) return { ok: false, error: "Slow down a little. Try again in a few seconds." };
  let parent: string | null = null;
  if (replyToId) { const [t] = await db.select().from(communityPost).where(and(eq(communityPost.id, replyToId), eq(communityPost.room, room))); parent = t?.id ?? null; }
  const row = { id: crypto.randomUUID(), room, userId: user.id, authorName: name, body: p.data, replyToId: parent, reports: 0, createdAt: new Date() };
  await db.insert(communityPost).values(row);
  return { ok: true, post: (await shape([row], user))[0] };
}

export async function deletePost(id: string) {
  const user = await requireUser();
  const [r] = await db.select().from(communityPost).where(eq(communityPost.id, id));
  if (!r) return;
  if (r.userId === user.id || isAdmin(user.email)) await db.delete(communityPost).where(eq(communityPost.id, id));
}

export async function reportPost(id: string) {
  const user = await requireUser();
  const [r] = await db.select().from(communityPost).where(eq(communityPost.id, id));
  if (!r || r.userId === user.id) return { ok: false as const };
  const [dup] = await db.select().from(communityReport).where(and(eq(communityReport.postId, id), eq(communityReport.userId, user.id)));
  if (dup) return { ok: true as const };
  await db.insert(communityReport).values({ postId: id, userId: user.id });
  await db.update(communityPost).set({ reports: r.reports + 1 }).where(eq(communityPost.id, id));
  return { ok: true as const };
}

/** How many posts each room has had in the last day, for the room list. */
export async function roomActivity(): Promise<Record<string, number>> {
  await requireUser();
  const rows = await db.select({ room: communityPost.room, n: sql<number>`count(*)` }).from(communityPost).where(gt(communityPost.createdAt, new Date(Date.now() - 864e5))).groupBy(communityPost.room);
  return Object.fromEntries(rows.map((r) => [r.room, r.n]));
}
