"use client";

import { createDirectChat, createGroupChat, type Person } from "@/lib/chat-client";
import { MAX_GROUP_NAME, MAX_MEMBERS } from "@/lib/chat";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, pingChats, Sheet } from "./ChatBits";
import PeoplePicker from "./PeoplePicker";

export default function NewChatSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [picked, setPicked] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const room = MAX_MEMBERS - 1; // people you can add besides yourself

  function close() { onClose(); setTimeout(() => { setMode("direct"); setPicked([]); setName(""); setErr(""); }, 250); }

  async function startDirect(p: Person) {
    if (busy) return;
    setBusy(true); setErr("");
    const r = await createDirectChat(p.id);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    pingChats(); close(); router.push(`/community/chats/${r.id}`);
  }
  function toggle(p: Person) {
    if (mode === "direct") return void startDirect(p);
    setErr("");
    setPicked((c) => c.some((x) => x.id === p.id) ? c.filter((x) => x.id !== p.id) : c.length >= room ? (setErr(`A group holds up to ${MAX_MEMBERS} people, including you.`), c) : [...c, p]);
  }
  async function makeGroup() {
    if (busy) return;
    setBusy(true); setErr("");
    const r = await createGroupChat(name, picked.map((p) => p.id));
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    pingChats(); close(); router.push(`/community/chats/${r.id}`);
  }

  return (
    <Sheet open={open} onClose={close} title="New chat">
      <div role="tablist" aria-label="Kind of chat" className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-light p-1 dark:bg-darkmode-light">
        {([["direct", "One person"], ["group", "Group"]] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={mode === id} type="button" onClick={() => { setMode(id); setErr(""); setPicked([]); }} className={`rounded-full py-2 text-sm font-semibold transition ${mode === id ? "bg-card text-text-dark shadow dark:bg-darkmode-card dark:text-darkmode-text-dark" : "text-text-light dark:text-darkmode-text-light"}`}>{label}</button>
        ))}
      </div>

      {mode === "group" && (
        <div className="mb-4 space-y-3">
          <div>
            <label htmlFor="gname" className="form-label">Group name</label>
            <input id="gname" className="form-input" maxLength={MAX_GROUP_NAME} placeholder="e.g. Leg day crew" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <p className="form-label">People <span className="font-normal text-text-light dark:text-darkmode-text-light">({picked.length + 1} of {MAX_MEMBERS}, you included)</span></p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-light py-1 pl-1 pr-3 text-sm font-semibold dark:bg-darkmode-light">You</span>
              {picked.map((p) => (
                <button key={p.id} type="button" onClick={() => toggle(p)} aria-label={`Remove @${p.name}`} className="inline-flex items-center gap-2 rounded-full bg-light py-1 pl-1 pr-3 text-sm font-semibold transition hover:bg-border dark:bg-darkmode-light"><Avatar name={p.name} size={24} />@{p.name} <span aria-hidden>×</span></button>
              ))}
            </div>
          </div>
        </div>
      )}

      <PeoplePicker selected={picked} onToggle={toggle} onlyOne={mode === "direct"} placeholder={mode === "direct" ? "Who do you want to message?" : "Add people by username"} />
      {err && <p role="alert" className="mt-3 text-sm font-semibold text-red-600 dark:text-red-400">{err}</p>}

      {mode === "group" && (
        <button type="button" className="btn btn-primary mt-4 w-full" disabled={busy || !name.trim() || picked.length < 1} onClick={makeGroup}>{busy ? "Creating…" : `Create group${picked.length ? ` with ${picked.length} ${picked.length === 1 ? "person" : "people"}` : ""}`}</button>
      )}
    </Sheet>
  );
}
