import type { ReactNode } from "react";
import { plateVar } from "@/lib/plates";

export type Tone = "red" | "blue" | "yellow" | "green" | "steel" | "accent";

const TEXT: Record<Tone, string> = {
  accent: "text-primary dark:text-darkmode-primary",
  red: "text-plate-red dark:text-darkmode-plate-red",
  blue: "text-plate-blue dark:text-darkmode-plate-blue",
  yellow: "text-plate-yellow dark:text-darkmode-plate-yellow",
  green: "text-plate-green dark:text-darkmode-plate-green",
  steel: "text-plate-steel dark:text-darkmode-plate-steel",
};
export const BG: Record<Tone, string> = {
  accent: "bg-primary dark:bg-darkmode-primary",
  red: "bg-plate-red dark:bg-darkmode-plate-red",
  blue: "bg-plate-blue dark:bg-darkmode-plate-blue",
  yellow: "bg-plate-yellow dark:bg-darkmode-plate-yellow",
  green: "bg-plate-green dark:bg-darkmode-plate-green",
  steel: "bg-plate-steel dark:bg-darkmode-plate-steel",
};

/** A weight plate seen from the front: coloured disc, machined grooves, raised hub and a bar hole. */
export function PlateMark({ tone = "red", className = "", spin, color }: { tone?: Tone; className?: string; spin?: "slow" | "slow-rev"; /** a workout's own plate colour (see lib/plates.ts); overrides tone */ color?: number }) {
  const notches = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg aria-hidden viewBox="0 0 200 200" style={color === undefined ? undefined : { color: plateVar(color) }} className={`${color === undefined ? TEXT[tone] : ""} ${spin === "slow" ? "animate-spin-slow" : spin === "slow-rev" ? "animate-spin-slow-rev" : ""} ${className}`}>
      <path fill="currentColor" fillRule="evenodd" d="M100 4a96 96 0 1 0 0 192 96 96 0 0 0 0-192Zm0 86a10 10 0 1 1 0 20 10 10 0 0 1 0-20Z" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="2" />
      <circle cx="100" cy="100" r="68" fill="none" stroke="#000" strokeOpacity=".16" strokeWidth="3" />
      <circle cx="100" cy="100" r="46" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
      <circle cx="100" cy="100" r="28" fill="none" stroke="#000" strokeOpacity=".18" strokeWidth="3" />
      {notches.map((a) => <rect key={a} x="97" y="10" width="6" height="14" rx="3" fill="#fff" fillOpacity=".5" transform={`rotate(${a} 100 100)`} />)}
    </svg>
  );
}

/** Large, very faint plates that drift behind the whole app. */
export function AmbientPlates() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="decor-pattern" data-for="home" />
      <PlateMark tone="red" spin="slow" className="absolute -right-48 top-[34%] h-[560px] w-[560px] opacity-[0.05] dark:opacity-[0.06]" />
      <PlateMark tone="blue" spin="slow-rev" className="absolute -bottom-40 -left-56 h-[600px] w-[600px] opacity-[0.045] dark:opacity-[0.05]" />
    </div>
  );
}

/** Three plates getting smaller, like a stack on a bar. */
export function PlateStack({ tone = "red", className = "" }: { tone?: Tone; className?: string }) {
  return (
    <span aria-hidden className={`inline-flex items-center gap-[3px] ${className}`}>
      <i className={`block h-5 w-[5px] rounded-full ${BG[tone]}`} /><i className={`block h-3.5 w-[5px] rounded-full opacity-80 ${BG[tone]}`} /><i className={`block h-2.5 w-[5px] rounded-full opacity-60 ${BG[tone]}`} />
    </span>
  );
}

/** A section title with a rule that ends in a small plate. */
export function SectionTitle({ children, id, tone = "accent" }: { children: ReactNode; id?: string; tone?: Tone }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 id={id} className="h4 shrink-0">{children}</h2>
      <span aria-hidden className="h-px grow bg-gradient-to-r from-border to-transparent dark:from-darkmode-border" />
      <PlateStack tone={tone} />
    </div>
  );
}
