"use client";

import { AREAS, type AreaId, type Limits, type Severity } from "@/lib/limits";

type Choice = Severity | "none";
const NEXT: Record<Choice, Choice> = { none: "careful", careful: "avoid", avoid: "none" };
const WORD: Record<Choice, string> = { none: "Fine", careful: "Careful", avoid: "Avoid" };

/** A grid of body-area tiles. Tap a tile to cycle Fine, Careful, Avoid. The site then leaves out or flags exercises that load that area. */
export default function LimitsPicker({ value, onChange }: { value: Limits; onChange: (v: Limits) => void }) {
  const set = (a: AreaId, v: Choice) => {
    const next: Limits = { ...value };
    if (v === "none") delete next[a]; else next[a] = v;
    onChange(next);
  };
  return (
    <div className="space-y-4">
      <ul className="limit-legend" aria-hidden="true">
        <li data-c="none">Fine: no problem</li>
        <li data-c="careful">Careful: skip the hardest moves</li>
        <li data-c="avoid">Avoid: skip everything that loads it</li>
      </ul>
      <div className="limit-grid" data-testid="limits-picker">
        {AREAS.map((a) => {
          const cur: Choice = value[a.id] ?? "none";
          return (
            <button key={a.id} type="button" className="limit-tile" data-c={cur} data-area={a.id} data-choice={cur}
              aria-label={`${a.label}: ${WORD[cur]}. Tap to change.`} onClick={() => set(a.id, NEXT[cur])}>
              <span className="limit-name">{a.label}</span>
              <span className="limit-state"><i aria-hidden="true" />{WORD[cur]}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-text-light dark:text-darkmode-text-light">Tap a tile to change it. Careful means it bothers you a little or you are coming back from an injury. Avoid means it hurts or a doctor told you to stay away. This is a guide from exercise names, not medical advice.</p>
    </div>
  );
}
