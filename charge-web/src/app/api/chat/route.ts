import * as actions from "@/app/actions/chats";
import { NextResponse } from "next/server";

/**
 * Chat calls go through a plain route handler instead of Server Actions.
 * Server Actions share the router's queue (they run one at a time, and a
 * response that touches cookies makes Next re-apply the URL the call started
 * from), which made an open conversation jump back to the list. A fetch to
 * this route never involves the router.
 */
const OPS = new Set([
  "searchPeople", "createDirectChat", "createGroupChat", "listChats", "unreadChats", "listChatMessages",
  "sendChatMessage", "markChatRead", "deleteChatMessage", "reportChatMessage", "addChatMembers",
  "removeChatMember", "renameChat", "leaveChat", "blockUser", "unblockUser", "listBlocked",
]);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { op?: string; args?: unknown[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const { op, args } = body;
  if (!op || !OPS.has(op) || !Array.isArray(args)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    const fn = (actions as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[op];
    const result = await fn(...args);
    return NextResponse.json({ result: result ?? null });
  } catch (e) {
    // requireOnboarded() redirects when signed out; over fetch that is just a 401.
    const digest = (e as { digest?: string })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) return NextResponse.json({ error: "auth" }, { status: 401 });
    console.error("[chat api]", op, e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
