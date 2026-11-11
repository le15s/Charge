"use server";

import { db } from "@/db";
import { chat, chatBlock, chatMember, chatMessage, chatReport, profile, user as userTable } from "@/db/schema";
import { MAX_GROUP_NAME, MAX_MEMBERS, MAX_MSG } from "@/lib/chat";
import { requireOnboarded } from "@/lib/session";
import { and, asc, desc, eq, gt, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";

/* ---------- Types the screens use ---------- */
export type Person = { id: string; name: string };
export type MemberInfo = { id: string; name: string; owner: boolean; readAt: number };
export type ChatMsg = { id: string; kind: "text" | "system"; authorId: string | null; author: string | null; body: string; at: number; mine: boolean; reply: { author: string; body: string } | null };
export type ChatSummary = {
  id: string; kind: "direct" | "group"; title: string; otherId: string | null; members: number;
  last: { body: string; at: number; mine: boolean; author: string | null; system: boolean } | null;
  unread: number; isNew: boolean; at: number;
};
export type ChatFull = {
  id: string; kind: "direct" | "group"; title: string; ownerId: string | null; meId: string;
  members: MemberInfo[]; messages: ChatMsg[]; more: boolean; iBlocked: boolean; blockedMe: boolean;
};
type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

/* ---------- Small helpers ---------- */
const T = (n: number) => new Date(n);
const pairKey = (a: string, b: string) => [a, b].sort().join(":");

/** Display names (usernames) for a set of user ids. */
async function nameMap(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const list = [...new Set(ids.filter((x): x is string => !!x))];
  if (!list.length) return new Map();
  const rows = await db.select({ id: userTable.id, name: userTable.name, display: profile.displayName }).from(userTable).leftJoin(profile, eq(profile.userId, userTable.id)).where(inArray(userTable.id, list));
  return new Map(rows.map((r) => [r.id, r.display ?? r.name]));
}

async function personOf(id: string): Promise<Person | null> {
  const [r] = await db.select({ id: profile.userId, name: profile.displayName }).from(profile).where(and(eq(profile.userId, id), eq(profile.onboarded, true)));
  return r?.name ? { id: r.id, name: r.name } : null;
}

/** True when either of the two has blocked the other. */
async function blockedEither(a: string, b: string) {
  const [r] = await db.select({ x: chatBlock.userId }).from(chatBlock).where(or(and(eq(chatBlock.userId, a), eq(chatBlock.blockedId, b)), and(eq(chatBlock.userId, b), eq(chatBlock.blockedId, a)))).limit(1);
  return !!r;
}

async function membership(chatId: string, userId: string) {
  const [m] = await db.select().from(chatMember).where(and(eq(chatMember.chatId, chatId), eq(chatMember.userId, userId)));
  return m ?? null;
}

async function membersOf(chatId: string): Promise<MemberInfo[]> {
  const rows = await db.select({ id: chatMember.userId, role: chatMember.role, readAt: chatMember.lastReadAt, joined: chatMember.joinedAt, name: userTable.name, display: profile.displayName })
    .from(chatMember).innerJoin(userTable, eq(userTable.id, chatMember.userId)).leftJoin(profile, eq(profile.userId, chatMember.userId))
    .where(eq(chatMember.chatId, chatId)).orderBy(asc(chatMember.joinedAt));
  return rows.map((r) => ({ id: r.id, name: r.display ?? r.name, owner: r.role === "owner", readAt: r.readAt.getTime() }));
}

async function shapeMessages(rows: (typeof chatMessage.$inferSelect)[], meId: string): Promise<ChatMsg[]> {
  if (!rows.length) return [];
  const parentIds = [...new Set(rows.map((r) => r.replyToId).filter((x): x is string => !!x))];
  const parents = parentIds.length ? await db.select().from(chatMessage).where(inArray(chatMessage.id, parentIds)) : [];
  const names = await nameMap([...rows.map((r) => r.userId), ...parents.map((p) => p.userId)]);
  const pm = new Map(parents.map((p) => [p.id, p]));
  return rows.map((r) => {
    const p = r.replyToId ? pm.get(r.replyToId) : null;
    return {
      id: r.id, kind: r.kind === "system" ? "system" : "text", authorId: r.userId, author: r.userId ? (names.get(r.userId) ?? "Someone") : null,
      body: r.body, at: r.createdAt.getTime(), mine: r.userId === meId,
      reply: p ? { author: p.userId ? (names.get(p.userId) ?? "Someone") : "Charge", body: p.body.slice(0, 120) } : null,
    };
  });
}

/** Adds a system line ("@sam left") and moves it into the chat list preview. Returns the statements so callers can run them together. */
function systemLine(chatId: string, actorId: string, body: string, at = new Date()) {
  const id = crypto.randomUUID();
  return [
    db.insert(chatMessage).values({ id, chatId, userId: actorId, kind: "system", body, createdAt: at }),
    db.update(chat).set({ lastMessageAt: at, lastBody: body, lastAuthorId: actorId, lastKind: "system" }).where(eq(chat.id, chatId)),
  ] as const;
}

async function tooManyNewChats(userId: string) {
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(chat).where(and(eq(chat.createdBy, userId), gt(chat.createdAt, T(Date.now() - 3600_000))));
  return (r?.n ?? 0) >= 15;
}

/* ---------- Finding people ---------- */
export async function searchPeople(q: string): Promise<Person[]> {
  const { user: me } = await requireOnboarded();
  const needle = q.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20);
  if (needle.length < 2) return [];
  const esc = needle.replace(/[_]/g, "\\_");
  const blocks = await db.select({ a: chatBlock.userId, b: chatBlock.blockedId }).from(chatBlock).where(or(eq(chatBlock.userId, me.id), eq(chatBlock.blockedId, me.id)));
  const hide = new Set(blocks.flatMap((x) => [x.a, x.b]));
  const rows = await db.select({ id: profile.userId, name: profile.displayName }).from(profile)
    .where(and(eq(profile.onboarded, true), ne(profile.userId, me.id), sql`lower(${profile.displayName}) like ${"%" + esc + "%"} escape '\\'`))
    .orderBy(sql`case when lower(${profile.displayName}) like ${esc + "%"} escape '\\' then 0 else 1 end`, asc(profile.displayName)).limit(14);
  return rows.filter((r) => r.name && !hide.has(r.id)).slice(0, 10).map((r) => ({ id: r.id, name: r.name as string }));
}

/* ---------- Making chats ---------- */
export async function createDirectChat(otherId: string): Promise<{ ok: true; id: string } | Fail> {
  const { user: me } = await requireOnboarded();
  if (!otherId || otherId === me.id) return fail("Pick someone else.");
  const other = await personOf(otherId);
  if (!other) return fail("That person isn't on Charge.");
  if (await blockedEither(me.id, otherId)) return fail("You can't message this person.");
  const key = pairKey(me.id, otherId);
  const [existing] = await db.select().from(chat).where(eq(chat.directKey, key));
  if (existing) return { ok: true, id: existing.id };
  if (await tooManyNewChats(me.id)) return fail("You've started a lot of chats in a short time. Try again a little later.");
  const id = crypto.randomUUID(), now = new Date();
  try {
    await db.batch([
      db.insert(chat).values({ id, kind: "direct", createdBy: me.id, directKey: key, lastMessageAt: T(0), createdAt: now }),
      db.insert(chatMember).values([
        { chatId: id, userId: me.id, role: "member", joinedAt: now, lastReadAt: now, clearedAt: T(0) },
        { chatId: id, userId: otherId, role: "member", joinedAt: now, lastReadAt: T(0), clearedAt: T(0) },
      ]),
    ]);
  } catch {
    // both people opened the chat at the same moment: use the one that won
    const [won] = await db.select().from(chat).where(eq(chat.directKey, key));
    if (won) return { ok: true, id: won.id };
    return fail("Couldn't start the chat. Try again.");
  }
  return { ok: true, id };
}

export async function createGroupChat(name: string, memberIds: string[]): Promise<{ ok: true; id: string } | Fail> {
  const { user: me, profile: mine } = await requireOnboarded();
  const nm = z.string().trim().min(1).max(MAX_GROUP_NAME).safeParse(name);
  if (!nm.success) return fail(`Give the group a name (up to ${MAX_GROUP_NAME} characters).`);
  const ids = [...new Set(memberIds)].filter((x) => x && x !== me.id);
  if (ids.length < 1) return fail("Add at least one other person.");
  if (ids.length + 1 > MAX_MEMBERS) return fail(`A group holds up to ${MAX_MEMBERS} people, including you.`);
  const people = await Promise.all(ids.map(personOf));
  if (people.some((p) => !p)) return fail("One of those people isn't on Charge any more.");
  for (const p of people as Person[]) if (await blockedEither(me.id, p.id)) return fail(`You can't add @${p.name}.`);
  if (await tooManyNewChats(me.id)) return fail("You've started a lot of chats in a short time. Try again a little later.");
  const id = crypto.randomUUID(), now = new Date();
  const line = `@${mine.displayName ?? me.name} created the group`;
  await db.batch([
    db.insert(chat).values({ id, kind: "group", name: nm.data, createdBy: me.id, lastMessageAt: now, lastBody: line, lastAuthorId: me.id, lastKind: "system", createdAt: now }),
    db.insert(chatMember).values([
      { chatId: id, userId: me.id, role: "owner", joinedAt: now, lastReadAt: now, clearedAt: T(0) },
      ...ids.map((uid) => ({ chatId: id, userId: uid, role: "member", joinedAt: now, lastReadAt: T(0), clearedAt: T(0) })),
    ]),
    db.insert(chatMessage).values({ id: crypto.randomUUID(), chatId: id, userId: me.id, kind: "system", body: line, createdAt: now }),
  ]);
  return { ok: true, id };
}

/* ---------- Reading ---------- */
async function summaries(meId: string): Promise<ChatSummary[]> {
  const rows = await db.select({ c: chat, m: chatMember }).from(chatMember).innerJoin(chat, eq(chat.id, chatMember.chatId)).where(eq(chatMember.userId, meId));
  // a 1-on-1 chat only shows up once it has messages you can see
  const shown = rows.filter(({ c, m }) => c.kind === "group" || c.lastMessageAt.getTime() > m.clearedAt.getTime());
  if (!shown.length) return [];
  const ids = shown.map((r) => r.c.id);
  const mem = await db.select({ chatId: chatMember.chatId, userId: chatMember.userId }).from(chatMember).where(inArray(chatMember.chatId, ids));
  const names = await nameMap([...mem.map((x) => x.userId), ...shown.map((r) => r.c.lastAuthorId)]);
  const unreadRows = await db.select({ chatId: chatMessage.chatId, n: sql<number>`count(*)` }).from(chatMessage)
    .innerJoin(chatMember, and(eq(chatMember.chatId, chatMessage.chatId), eq(chatMember.userId, meId)))
    .where(and(inArray(chatMessage.chatId, ids), eq(chatMessage.kind, "text"), ne(chatMessage.userId, meId), gt(chatMessage.createdAt, chatMember.lastReadAt), gt(chatMessage.createdAt, chatMember.clearedAt)))
    .groupBy(chatMessage.chatId);
  const unread = new Map(unreadRows.map((r) => [r.chatId, r.n]));
  return shown.map(({ c, m }) => {
    const people = mem.filter((x) => x.chatId === c.id);
    const otherId = c.kind === "direct" ? (people.find((x) => x.userId !== meId)?.userId ?? null) : null;
    const hasLast = c.lastBody != null && c.lastMessageAt.getTime() > m.clearedAt.getTime();
    return {
      id: c.id, kind: c.kind === "group" ? "group" : "direct",
      title: c.kind === "group" ? (c.name ?? "Group") : (otherId ? (names.get(otherId) ?? "Someone") : "Deleted account"),
      otherId, members: people.length,
      last: hasLast ? { body: c.lastBody as string, at: c.lastMessageAt.getTime(), mine: c.lastAuthorId === meId, author: c.lastAuthorId ? (names.get(c.lastAuthorId) ?? null) : null, system: c.lastKind === "system" } : null,
      unread: unread.get(c.id) ?? 0, isNew: m.lastReadAt.getTime() === 0, at: Math.max(c.lastMessageAt.getTime(), c.createdAt.getTime()),
    } satisfies ChatSummary;
  }).sort((a, b) => b.at - a.at);
}

export async function listChats(): Promise<ChatSummary[]> {
  const { user: me } = await requireOnboarded();
  return summaries(me.id);
}

/** How many chats have something new for you (drives the badge on the Community tab). */
export async function unreadChats(): Promise<number> {
  const { user: me } = await requireOnboarded();
  return (await summaries(me.id)).filter((c) => c.unread > 0 || c.isNew).length;
}

export async function getChat(chatId: string): Promise<ChatFull | null> {
  const { user: me } = await requireOnboarded();
  const m = await membership(chatId, me.id);
  if (!m) return null;
  const [c] = await db.select().from(chat).where(eq(chat.id, chatId));
  if (!c) return null;
  const members = await membersOf(chatId);
  const rows = await db.select().from(chatMessage).where(and(eq(chatMessage.chatId, chatId), gt(chatMessage.createdAt, m.clearedAt))).orderBy(desc(chatMessage.createdAt), desc(chatMessage.id)).limit(41);
  const messages = await shapeMessages(rows.slice(0, 40).reverse(), me.id);
  const other = c.kind === "direct" ? members.find((x) => x.id !== me.id) : null;
  const [iBlocked, blockedMe] = other
    ? await Promise.all([
        db.select({ x: chatBlock.userId }).from(chatBlock).where(and(eq(chatBlock.userId, me.id), eq(chatBlock.blockedId, other.id))).then((r) => r.length > 0),
        db.select({ x: chatBlock.userId }).from(chatBlock).where(and(eq(chatBlock.userId, other.id), eq(chatBlock.blockedId, me.id))).then((r) => r.length > 0),
      ])
    : [false, false];
  return {
    id: c.id, kind: c.kind === "group" ? "group" : "direct", title: c.kind === "group" ? (c.name ?? "Group") : (other?.name ?? "Deleted account"),
    ownerId: members.find((x) => x.owner)?.id ?? null, meId: me.id, members, messages, more: rows.length > 40, iBlocked, blockedMe,
  };
}

/** New messages (after a time) or older ones (before a time), plus who has read up to where. */
export async function listChatMessages(chatId: string, opts?: { after?: number; before?: number }): Promise<{ gone: true } | { gone: false; messages: ChatMsg[]; more: boolean; members: MemberInfo[] }> {
  const { user: me } = await requireOnboarded();
  const m = await membership(chatId, me.id);
  const visible = and(eq(chatMessage.chatId, chatId), gt(chatMessage.createdAt, m.clearedAt));
  let rows: (typeof chatMessage.$inferSelect)[];
  let more = false;
  if (opts?.after != null) {
    rows = await db.select().from(chatMessage).where(and(visible, gte(chatMessage.createdAt, T(opts.after)))).orderBy(asc(chatMessage.createdAt), asc(chatMessage.id)).limit(100);
  } else if (opts?.before != null) {
    const r = await db.select().from(chatMessage).where(and(visible, lt(chatMessage.createdAt, T(opts.before)))).orderBy(desc(chatMessage.createdAt), desc(chatMessage.id)).limit(41);
    more = r.length > 40; rows = r.slice(0, 40).reverse();
  } else {
    const r = await db.select().from(chatMessage).where(visible).orderBy(desc(chatMessage.createdAt), desc(chatMessage.id)).limit(41);
    more = r.length > 40; rows = r.slice(0, 40).reverse();
  }
  return { gone: false, messages: await shapeMessages(rows, me.id), more, members: await membersOf(chatId) };
}

/* ---------- Writing ---------- */
export async function sendChatMessage(chatId: string, body: string, replyToId?: string | null): Promise<{ ok: true; message: ChatMsg } | Fail> {
  const { user: me } = await requireOnboarded();
  const text = z.string().trim().min(1).max(MAX_MSG).safeParse(body);
  if (!text.success) return fail(`Write something (up to ${MAX_MSG} characters).`);
  const m = await membership(chatId, me.id);
  if (!m) return fail("You're not in this chat any more.");
  const [c] = await db.select().from(chat).where(eq(chat.id, chatId));
  if (!c) return fail("This chat doesn't exist any more.");
  if (c.kind === "direct") {
    const other = (await membersOf(chatId)).find((x) => x.id !== me.id);
    if (!other) return fail("This person is no longer on Charge.");
    if (await blockedEither(me.id, other.id)) return fail("You can't send messages in this chat.");
  }
  const [recent] = await db.select({ n: sql<number>`count(*)` }).from(chatMessage).where(and(eq(chatMessage.userId, me.id), eq(chatMessage.kind, "text"), gt(chatMessage.createdAt, T(Date.now() - 20_000))));
  if ((recent?.n ?? 0) >= 10) return fail("Slow down a little. Try again in a few seconds.");
  let parent: string | null = null;
  if (replyToId) { const [t] = await db.select({ id: chatMessage.id }).from(chatMessage).where(and(eq(chatMessage.id, replyToId), eq(chatMessage.chatId, chatId))); parent = t?.id ?? null; }
  // the clock never goes backwards inside a chat
  const at = new Date(Math.max(Date.now(), c.lastMessageAt.getTime() + 1));
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(chatMessage).values({ id, chatId, userId: me.id, kind: "text", body: text.data, replyToId: parent, createdAt: at }),
    db.update(chat).set({ lastMessageAt: at, lastBody: text.data.slice(0, 160), lastAuthorId: me.id, lastKind: "text" }).where(eq(chat.id, chatId)),
    db.update(chatMember).set({ lastReadAt: at }).where(and(eq(chatMember.chatId, chatId), eq(chatMember.userId, me.id))),
  ]);
  const [row] = await db.select().from(chatMessage).where(eq(chatMessage.id, id));
  return { ok: true, message: (await shapeMessages([row], me.id))[0] };
}

export async function markChatRead(chatId: string) {
  const { user: me } = await requireOnboarded();
  const m = await membership(chatId, me.id);
  if (!m) return;
  const [c] = await db.select({ at: chat.lastMessageAt }).from(chat).where(eq(chat.id, chatId));
  if (!c || (m.lastReadAt.getTime() >= c.at.getTime() && m.lastReadAt.getTime() > 0)) return;
  await db.update(chatMember).set({ lastReadAt: new Date(Math.max(Date.now(), c.at.getTime())) }).where(and(eq(chatMember.chatId, chatId), eq(chatMember.userId, me.id)));
}

export async function deleteChatMessage(id: string): Promise<{ ok: boolean }> {
  const { user: me } = await requireOnboarded();
  const [msg] = await db.select().from(chatMessage).where(eq(chatMessage.id, id));
  if (!msg || msg.userId !== me.id || msg.kind !== "text") return { ok: false };
  await db.delete(chatMessage).where(eq(chatMessage.id, id));
  const [c] = await db.select().from(chat).where(eq(chat.id, msg.chatId));
  if (c && c.lastMessageAt.getTime() === msg.createdAt.getTime()) {
    const [prev] = await db.select().from(chatMessage).where(eq(chatMessage.chatId, msg.chatId)).orderBy(desc(chatMessage.createdAt)).limit(1);
    await db.update(chat).set(prev ? { lastMessageAt: prev.createdAt, lastBody: prev.body.slice(0, 160), lastAuthorId: prev.userId, lastKind: prev.kind } : { lastMessageAt: c.kind === "group" ? c.createdAt : T(0), lastBody: null, lastAuthorId: null, lastKind: null }).where(eq(chat.id, msg.chatId));
  }
  return { ok: true };
}

export async function reportChatMessage(id: string): Promise<{ ok: boolean }> {
  const { user: me } = await requireOnboarded();
  const [msg] = await db.select().from(chatMessage).where(eq(chatMessage.id, id));
  if (!msg || msg.userId === me.id || msg.kind !== "text") return { ok: false };
  if (!(await membership(msg.chatId, me.id))) return { ok: false };
  const [dup] = await db.select({ id: chatReport.id }).from(chatReport).where(and(eq(chatReport.messageId, id), eq(chatReport.reporterId, me.id)));
  if (!dup) await db.insert(chatReport).values({ id: crypto.randomUUID(), chatId: msg.chatId, messageId: id, authorId: msg.userId, reporterId: me.id, body: msg.body, createdAt: new Date() });
  return { ok: true };
}

/* ---------- Group management ---------- */
async function ownerOnly(chatId: string, meId: string) {
  const [c] = await db.select().from(chat).where(eq(chat.id, chatId));
  const m = await membership(chatId, meId);
  if (!c || c.kind !== "group" || !m) return { error: "This group doesn't exist any more." } as const;
  if (m.role !== "owner") return { error: "Only the person who runs the group can do that." } as const;
  return { c } as const;
}

export async function addChatMembers(chatId: string, ids: string[]): Promise<{ ok: true; members: MemberInfo[] } | Fail> {
  const { user: me, profile: mine } = await requireOnboarded();
  const g = await ownerOnly(chatId, me.id);
  if ("error" in g) return fail(String(g.error));
  const current = await membersOf(chatId);
  const add = [...new Set(ids)].filter((x) => x && !current.some((c) => c.id === x));
  if (!add.length) return fail("Pick someone who isn't in the group yet.");
  if (current.length + add.length > MAX_MEMBERS) return fail(`A group holds up to ${MAX_MEMBERS} people. There's room for ${Math.max(0, MAX_MEMBERS - current.length)} more.`);
  const people = await Promise.all(add.map(personOf));
  if (people.some((p) => !p)) return fail("One of those people isn't on Charge any more.");
  for (const p of people as Person[]) if (await blockedEither(me.id, p.id)) return fail(`You can't add @${p.name}.`);
  const now = new Date();
  const line = `@${mine.displayName ?? me.name} added ${(people as Person[]).map((p) => "@" + p.name).join(", ")}`;
  await db.batch([
    // people who join later only see what is said from now on
    db.insert(chatMember).values(add.map((uid) => ({ chatId, userId: uid, role: "member", joinedAt: now, lastReadAt: T(0), clearedAt: T(now.getTime() - 1) }))),
    ...systemLine(chatId, me.id, line, now),
  ]);
  return { ok: true, members: await membersOf(chatId) };
}

export async function removeChatMember(chatId: string, userId: string): Promise<{ ok: true; members: MemberInfo[] } | Fail> {
  const { user: me, profile: mine } = await requireOnboarded();
  const g = await ownerOnly(chatId, me.id);
  if ("error" in g) return fail(String(g.error));
  if (userId === me.id) return fail("Use Leave group to leave.");
  const target = await membership(chatId, userId);
  if (!target) return fail("They're not in the group.");
  const names = await nameMap([userId]);
  await db.batch([
    db.delete(chatMember).where(and(eq(chatMember.chatId, chatId), eq(chatMember.userId, userId))),
    ...systemLine(chatId, me.id, `@${mine.displayName ?? me.name} removed @${names.get(userId) ?? "someone"}`),
  ]);
  return { ok: true, members: await membersOf(chatId) };
}

export async function renameChat(chatId: string, name: string): Promise<{ ok: true; name: string } | Fail> {
  const { user: me, profile: mine } = await requireOnboarded();
  const g = await ownerOnly(chatId, me.id);
  if ("error" in g) return fail(String(g.error));
  const nm = z.string().trim().min(1).max(MAX_GROUP_NAME).safeParse(name);
  if (!nm.success) return fail(`Give the group a name (up to ${MAX_GROUP_NAME} characters).`);
  if (nm.data === g.c.name) return { ok: true, name: nm.data };
  await db.batch([
    db.update(chat).set({ name: nm.data }).where(eq(chat.id, chatId)),
    ...systemLine(chatId, me.id, `@${mine.displayName ?? me.name} renamed the group to “${nm.data}”`),
  ]);
  return { ok: true, name: nm.data };
}

/** Leaving a group removes you from it. For a 1-on-1 chat it clears the history on your side (it comes back if they write again). */
export async function leaveChat(chatId: string): Promise<{ ok: boolean }> {
  const { user: me, profile: mine } = await requireOnboarded();
  const m = await membership(chatId, me.id);
  const [c] = await db.select().from(chat).where(eq(chat.id, chatId));
  if (!m || !c) return { ok: false };
  const now = new Date();
  if (c.kind === "direct") {
    await db.update(chatMember).set({ clearedAt: now, lastReadAt: now }).where(and(eq(chatMember.chatId, chatId), eq(chatMember.userId, me.id)));
    return { ok: true };
  }
  const others = (await membersOf(chatId)).filter((x) => x.id !== me.id);
  if (!others.length) { await db.delete(chat).where(eq(chat.id, chatId)); return { ok: true }; }
  const myName = mine.displayName ?? me.name;
  const steps: BatchItem<"sqlite">[] = [db.delete(chatMember).where(and(eq(chatMember.chatId, chatId), eq(chatMember.userId, me.id))), ...systemLine(chatId, me.id, `@${myName} left`, now)];
  if (m.role === "owner") {
    // the person who has been here longest takes over
    const heir = others[0];
    if (heir) {
      steps.push(db.update(chatMember).set({ role: "owner" }).where(and(eq(chatMember.chatId, chatId), eq(chatMember.userId, heir.id))));
      steps.push(...systemLine(chatId, heir.id, `@${heir.name} now runs the group`, new Date(now.getTime() + 1)));
    }
  }
  await db.batch(steps as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return { ok: true };
}

/* ---------- Blocking ---------- */
export async function blockUser(userId: string): Promise<{ ok: boolean }> {
  const { user: me } = await requireOnboarded();
  if (!userId || userId === me.id) return { ok: false };
  await db.insert(chatBlock).values({ userId: me.id, blockedId: userId, createdAt: new Date() }).onConflictDoNothing();
  return { ok: true };
}
export async function unblockUser(userId: string): Promise<{ ok: boolean }> {
  const { user: me } = await requireOnboarded();
  await db.delete(chatBlock).where(and(eq(chatBlock.userId, me.id), eq(chatBlock.blockedId, userId)));
  return { ok: true };
}
export async function listBlocked(): Promise<Person[]> {
  const { user: me } = await requireOnboarded();
  const rows = await db.select({ id: chatBlock.blockedId }).from(chatBlock).where(eq(chatBlock.userId, me.id));
  const names = await nameMap(rows.map((r) => r.id));
  return rows.map((r) => ({ id: r.id, name: names.get(r.id) ?? "Someone" }));
}
