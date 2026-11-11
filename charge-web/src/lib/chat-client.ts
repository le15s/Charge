"use client";

import type * as A from "@/app/actions/chats";

export type { ChatFull, ChatMsg, ChatSummary, MemberInfo, Person } from "@/app/actions/chats";

type Fns = typeof A;

async function call<K extends keyof Fns>(op: K, ...args: Parameters<Fns[K]>): Promise<Awaited<ReturnType<Fns[K]>>> {
  const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op, args }), cache: "no-store" });
  if (res.status === 401) { window.location.href = "/login"; return new Promise<never>(() => {}); }
  if (!res.ok) throw new Error(`chat ${String(op)} failed (${res.status})`);
  return (await res.json()).result as Awaited<ReturnType<Fns[K]>>;
}

export const searchPeople = (...a: Parameters<Fns["searchPeople"]>) => call("searchPeople", ...a);
export const createDirectChat = (...a: Parameters<Fns["createDirectChat"]>) => call("createDirectChat", ...a);
export const createGroupChat = (...a: Parameters<Fns["createGroupChat"]>) => call("createGroupChat", ...a);
export const listChats = (...a: Parameters<Fns["listChats"]>) => call("listChats", ...a);
export const unreadChats = (...a: Parameters<Fns["unreadChats"]>) => call("unreadChats", ...a);
export const listChatMessages = (...a: Parameters<Fns["listChatMessages"]>) => call("listChatMessages", ...a);
export const sendChatMessage = (...a: Parameters<Fns["sendChatMessage"]>) => call("sendChatMessage", ...a);
export const markChatRead = (...a: Parameters<Fns["markChatRead"]>) => call("markChatRead", ...a);
export const deleteChatMessage = (...a: Parameters<Fns["deleteChatMessage"]>) => call("deleteChatMessage", ...a);
export const reportChatMessage = (...a: Parameters<Fns["reportChatMessage"]>) => call("reportChatMessage", ...a);
export const addChatMembers = (...a: Parameters<Fns["addChatMembers"]>) => call("addChatMembers", ...a);
export const removeChatMember = (...a: Parameters<Fns["removeChatMember"]>) => call("removeChatMember", ...a);
export const renameChat = (...a: Parameters<Fns["renameChat"]>) => call("renameChat", ...a);
export const leaveChat = (...a: Parameters<Fns["leaveChat"]>) => call("leaveChat", ...a);
export const blockUser = (...a: Parameters<Fns["blockUser"]>) => call("blockUser", ...a);
export const unblockUser = (...a: Parameters<Fns["unblockUser"]>) => call("unblockUser", ...a);
export const listBlocked = (...a: Parameters<Fns["listBlocked"]>) => call("listBlocked", ...a);
