"use client";

import { searchPeople, type Person } from "@/lib/chat-client";
import { useEffect, useRef, useState } from "react";
import { FiCheck, FiSearch } from "react-icons/fi";
import { Avatar } from "./ChatBits";

/** Type a username, get matching people. Used for new chats and for adding people to a group. */
export default function PeoplePicker({ selected, onToggle, onlyOne, hideIds = [], placeholder = "Search by username" }: { selected: Person[]; onToggle: (p: Person) => void; onlyOne?: boolean; hideIds?: string[]; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const my = ++seq.current;
    if (q.trim().length < 2) { setHits([]); setBusy(false); return; }
    setBusy(true);
    const t = setTimeout(async () => {
      const r = await searchPeople(q);
      if (my !== seq.current) return;
      setHits(r); setBusy(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const shown = hits.filter((h) => !hideIds.includes(h.id));
  return (
    <div>
      <div className="relative">
        <FiSearch aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-text-light dark:text-darkmode-text-light" />
        <input type="search" autoFocus autoComplete="off" autoCapitalize="none" spellCheck={false} aria-label="Search people by username" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} className="form-input !rounded-full !py-3 !pl-11" />
      </div>
      <ul className="mt-3 space-y-1" aria-live="polite">
        {shown.map((p) => {
          const on = selected.some((s) => s.id === p.id);
          return (
            <li key={p.id}>
              <button type="button" onClick={() => onToggle(p)} aria-pressed={onlyOne ? undefined : on} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-light dark:hover:bg-darkmode-light ${on ? "bg-light dark:bg-darkmode-light" : ""}`}>
                <Avatar name={p.name} size={40} />
                <span className="grow font-semibold text-text-dark dark:text-darkmode-text-dark">@{p.name}</span>
                {!onlyOne && <span aria-hidden className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-sm transition ${on ? "border-primary bg-primary text-[color:var(--sk-ink)] dark:border-darkmode-primary dark:bg-darkmode-primary" : "border-border dark:border-darkmode-border"}`}>{on && <FiCheck />}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {q.trim().length >= 2 && !busy && !shown.length && <p className="py-6 text-center text-sm">No one called “{q.trim()}”. Check the spelling, usernames are exact.</p>}
      {q.trim().length < 2 && <p className="py-6 text-center text-sm text-text-light dark:text-darkmode-text-light">Type at least 2 letters of their username.</p>}
    </div>
  );
}
