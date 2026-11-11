import { plateVar } from "@/lib/plates";

export type CycleStep = { id: string; name: string; color: number };

/** Your rotation as a row of numbered plates. The next workout is ringed and marked. */
export default function CycleBoard({ steps, pos }: { steps: CycleStep[]; pos: number }) {
  if (steps.length < 2) return null;
  return (
    <section aria-label="Your rotation" className="card mb-6 p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-text-light dark:text-darkmode-text-light">Your cycle</p>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {steps.map((s, i) => {
          const next = i === pos;
          return (
            <li key={`${s.id}-${i}`} className="flex items-center gap-2" aria-current={next ? "step" : undefined}>
              <span className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-semibold ${next ? "border-primary dark:border-darkmode-primary" : "border-border dark:border-darkmode-border"}`}>
                <i aria-hidden className="block h-3 w-3 rounded-full ring-1 ring-inset ring-black/15" style={{ background: plateVar(s.color) }} />
                {s.name}
                {next && <b className="text-[11px] font-bold uppercase tracking-wider text-primary dark:text-darkmode-primary">next</b>}
              </span>
              {i < steps.length - 1 && <span aria-hidden className="text-text-light dark:text-darkmode-text-light">→</span>}
            </li>
          );
        })}
        <li aria-hidden className="ml-1 text-sm text-text-light dark:text-darkmode-text-light">↻ then it starts over</li>
      </ol>
    </section>
  );
}
