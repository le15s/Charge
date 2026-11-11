"use client";

import { addChatMembers, blockUser, leaveChat, removeChatMember, renameChat, unblockUser, type MemberInfo, type Person } from "@/lib/chat-client";
import { MAX_GROUP_NAME, MAX_MEMBERS } from "@/lib/chat";
import { useState } from "react";
import { FiLogOut, FiSlash, FiTrash2, FiUserPlus } from "react-icons/fi";
import { Avatar, Sheet } from "./ChatBits";
import PeoplePicker from "./PeoplePicker";

type Props = {
  open: boolean; onClose: () => void;
  chat: { id: string; kind: "direct" | "group"; title: string; ownerId: string | null; meId: string; members: MemberInfo[] };
  iBlocked: boolean;
  onMembers: (m: MemberInfo[]) => void; onRenamed: (name: string) => void; onBlocked: (b: boolean) => void; onGone: () => void;
};

/** Who is in the chat, and the things you can do about it: add or remove people, rename, leave, block. */
export default function ChatInfoSheet({ open, onClose, chat, iBlocked, onMembers, onRenamed, onBlocked, onGone }: Props) {
  const isGroup = chat.kind === "group";
  const iOwn = chat.ownerId === chat.meId;
  const [name, setName] = useState(chat.title);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Person[]>([]);
  const [confirm, setConfirm] = useState<null | "leave" | "block" | "delete">(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const room = MAX_MEMBERS - chat.members.length;
  const other = chat.members.find((m) => m.id !== chat.meId);

  async function run<T extends { ok: boolean }>(fn: () => Promise<T>, then?: (r: T) => void) {
    setBusy(true); setErr("");
    const r = await fn();
    setBusy(false);
    if (!r.ok) return setErr((r as unknown as { error?: string }).error ?? "That didn't work. Try again.");
    then?.(r);
  }

  return (
    <Sheet open={open} onClose={() => { setConfirm(null); setAdding(false); setErr(""); onClose(); }} title={isGroup ? "Group info" : "Chat info"}>
      <div className="mb-5 flex flex-col items-center text-center">
        <Avatar name={chat.title} group={isGroup} size={76} />
        <p className="mt-3 text-xl font-bold text-text-dark dark:text-darkmode-text-dark">{isGroup ? chat.title : `@${chat.title}`}</p>
        <p className="text-sm text-text-light dark:text-darkmode-text-light">{isGroup ? `${chat.members.length} of ${MAX_MEMBERS} people` : "Direct message"}</p>
      </div>

      {isGroup && iOwn && (
        <form className="mb-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); void run(() => renameChat(chat.id, name), (r) => onRenamed((r as { name: string }).name)); }}>
          <label htmlFor="gn" className="sr-only">Group name</label>
          <input id="gn" className="form-input !py-2.5" maxLength={MAX_GROUP_NAME} value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-outline-primary btn-sm shrink-0" disabled={busy || !name.trim() || name.trim() === chat.title}>Rename</button>
        </form>
      )}

      {isGroup && (
        <section aria-label="People in this group">
          <ul className="space-y-1">
            {chat.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-2xl px-2 py-1.5">
                <Avatar name={m.name} size={38} />
                <span className="min-w-0 grow"><span className="block truncate font-semibold text-text-dark dark:text-darkmode-text-dark">@{m.name}{m.id === chat.meId && " (you)"}</span></span>
                {m.owner && <span className="rounded-full bg-light px-2.5 py-0.5 text-xs font-bold text-primary dark:bg-darkmode-light dark:text-darkmode-primary">runs the group</span>}
                {iOwn && m.id !== chat.meId && <button className="text-sm font-semibold text-red-600 underline dark:text-red-400" disabled={busy} aria-label={`Remove @${m.name} from the group`} onClick={() => run(() => removeChatMember(chat.id, m.id), (r) => onMembers((r as { members: MemberInfo[] }).members))}>Remove</button>}
              </li>
            ))}
          </ul>
          {iOwn && room > 0 && !adding && <button type="button" className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-2.5 text-sm font-semibold hover:bg-light dark:border-darkmode-border dark:hover:bg-darkmode-light" onClick={() => setAdding(true)}><FiUserPlus aria-hidden /> Add people ({room} spot{room > 1 ? "s" : ""} left)</button>}
          {iOwn && room <= 0 && <p className="mt-3 text-center text-sm text-text-light dark:text-darkmode-text-light">The group is full ({MAX_MEMBERS} people).</p>}
          {!iOwn && <p className="mt-3 text-center text-sm text-text-light dark:text-darkmode-text-light">Only the person who runs the group can add or remove people.</p>}
          {adding && (
            <div className="mt-3 rounded-2xl bg-light/60 p-3 dark:bg-darkmode-light/60">
              <PeoplePicker selected={picked} hideIds={chat.members.map((m) => m.id)} onToggle={(p) => setPicked((c) => c.some((x) => x.id === p.id) ? c.filter((x) => x.id !== p.id) : c.length >= room ? c : [...c, p])} placeholder="Add people by username" />
              <div className="mt-3 flex justify-end gap-2">
                <button className="btn btn-outline-primary btn-sm" onClick={() => { setAdding(false); setPicked([]); }}>Cancel</button>
                <button className="btn btn-primary btn-sm" disabled={busy || !picked.length} onClick={() => run(() => addChatMembers(chat.id, picked.map((p) => p.id)), (r) => { onMembers((r as { members: MemberInfo[] }).members); setPicked([]); setAdding(false); })}>Add {picked.length || ""}</button>
              </div>
            </div>
          )}
        </section>
      )}

      {err && <p role="alert" className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">{err}</p>}

      <div className="mt-6 space-y-2 border-t border-border pt-4 dark:border-darkmode-border">
        {!isGroup && other && (
          iBlocked
            ? <button className="btn btn-outline-primary w-full" disabled={busy} onClick={() => run(() => unblockUser(other.id), () => onBlocked(false))}>Unblock @{other.name}</button>
            : confirm === "block"
              ? <Confirm text={`Block @${other.name}? You won't be able to message each other.`} yes="Block" busy={busy} onNo={() => setConfirm(null)} onYes={() => run(() => blockUser(other.id), () => { onBlocked(true); setConfirm(null); })} />
              : <button className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-red-600 hover:bg-light dark:text-red-400 dark:hover:bg-darkmode-light" onClick={() => setConfirm("block")}><FiSlash aria-hidden /> Block @{other.name}</button>
        )}
        {!isGroup && (confirm === "delete"
          ? <Confirm text="Delete this chat? It disappears for you. They keep their copy." yes="Delete" busy={busy} onNo={() => setConfirm(null)} onYes={() => run(() => leaveChat(chat.id), () => onGone())} />
          : <button className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-red-600 hover:bg-light dark:text-red-400 dark:hover:bg-darkmode-light" onClick={() => setConfirm("delete")}><FiTrash2 aria-hidden /> Delete chat</button>)}
        {isGroup && (confirm === "leave"
          ? <Confirm text={iOwn && chat.members.length > 1 ? "Leave this group? The person who has been here longest takes over." : "Leave this group?"} yes="Leave" busy={busy} onNo={() => setConfirm(null)} onYes={() => run(() => leaveChat(chat.id), () => onGone())} />
          : <button className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-red-600 hover:bg-light dark:text-red-400 dark:hover:bg-darkmode-light" onClick={() => setConfirm("leave")}><FiLogOut aria-hidden /> Leave group</button>)}
      </div>
    </Sheet>
  );
}

function Confirm({ text, yes, onYes, onNo, busy }: { text: string; yes: string; onYes: () => void; onNo: () => void; busy: boolean }) {
  return (
    <div role="alertdialog" className="rounded-2xl bg-light p-4 text-center dark:bg-darkmode-light">
      <p className="mb-3 text-sm font-semibold text-text-dark dark:text-darkmode-text-dark">{text}</p>
      <div className="flex justify-center gap-3"><button className="btn btn-outline-primary btn-sm" onClick={onNo}>Cancel</button><button className="btn btn-sm border-red-600 bg-red-600 text-white" disabled={busy} onClick={onYes}>{yes}</button></div>
    </div>
  );
}
