"use client";

import type { BodyData } from "@/app/actions/body";
import type { TrainingStats } from "@/app/actions/training-stats";
import { dayMs } from "@/lib/body";
import { toDisplay, type Units } from "@/lib/units";
import Link from "next/link";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ProgressChart from "./ProgressChart";

const Body3D = dynamic(() => import("./Body3D"), { ssr: false, loading: () => <div className="skeleton mx-auto h-[420px] w-full max-w-[460px] rounded-2xl sm:h-[520px]" aria-hidden /> });

const pill = (on: boolean) => `rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${on ? "bg-[color:var(--sk-accent)] text-[color:var(--sk-ink)]" : "bg-[color:var(--sk-light)] hover:brightness-95"}`;

/* ---------------- Muscle map ---------------- */
const LABEL: Record<string, string> = {
  abdominals: "Abs", abductors: "Abductors", adductors: "Adductors", biceps: "Biceps", calves: "Calves", chest: "Chest", forearms: "Forearms",
  glutes: "Glutes", hamstrings: "Hamstrings", lats: "Lats", "lower back": "Lower back", "middle back": "Middle back", neck: "Neck",
  quadriceps: "Quads", shoulders: "Shoulders", traps: "Traps", triceps: "Triceps",
};
const ALL = Object.keys(LABEL);

type Shape = { m: string; side?: boolean; d?: string; e?: [number, number, number, number, number?] };
// Left-hand shapes are mirrored to the right when `side` is set; centre shapes are drawn once. Body is 200 wide, centred on x = 100.
const FRONT: Shape[] = [
  { m: "neck", d: "M92 46h16v14q-8 5-16 0z" },
  { m: "chest", side: true, d: "M99 78v36q-19 8-32-6-4-16 7-26 12-8 25-4z" },
  { m: "abdominals", d: "M87 118h26v58q-13 8-26 0z" },
  { m: "shoulders", side: true, e: [62, 82, 13, 15] },
  { m: "biceps", side: true, e: [50, 116, 8.5, 21, 6] },
  { m: "forearms", side: true, e: [43, 162, 7.5, 23, 5] },
  { m: "abductors", side: true, e: [62, 196, 5.5, 12] },
  { m: "adductors", side: true, e: [93, 228, 5.5, 26] },
  { m: "quadriceps", side: true, e: [78, 240, 14.5, 46] },
  { m: "calves", side: true, e: [76, 334, 10.5, 38] },
];
const BACK: Shape[] = [
  { m: "neck", d: "M92 46h16v12h-16z" },
  { m: "middle back", d: "M90 100h20v40h-20z" },
  { m: "lower back", d: "M90 142h20v26q-10 4-20 0z" },
  { m: "lats", side: true, d: "M90 100q-20-3-22 20 2 28 18 40h4z" },
  { m: "traps", d: "M100 56q-14 4-28 18l12 14 16 24 16-24 12-14q-14-14-28-18z" },
  { m: "shoulders", side: true, e: [62, 82, 13, 15] },
  { m: "triceps", side: true, e: [50, 116, 8.5, 21, 6] },
  { m: "forearms", side: true, e: [43, 162, 7.5, 23, 5] },
  { m: "glutes", side: true, e: [85, 190, 15, 17] },
  { m: "abductors", side: true, e: [62, 192, 5.5, 11] },
  { m: "hamstrings", side: true, e: [78, 250, 14.5, 42] },
  { m: "calves", side: true, e: [76, 334, 10.5, 38] },
];

function Figure({ title, shapes, fill, sel, onPick }: { title: string; shapes: Shape[]; fill: (m: string) => string; sel: string | null; onPick: (m: string) => void }) {
  const node = (s: Shape, k: string, mirror: boolean) => {
    const common = {
      fill: fill(s.m), stroke: sel === s.m ? "var(--sk-accent-text)" : "var(--sk-line)", strokeWidth: sel === s.m ? 2.5 : 1.2,
      onClick: () => onPick(s.m), style: { cursor: "pointer", transition: "fill .3s" }, transform: mirror ? "translate(200 0) scale(-1 1)" : undefined,
    };
    if (s.e) { const [cx, cy, rx, ry, rot] = s.e; return <ellipse key={k} {...common} cx={cx} cy={cy} rx={rx} ry={ry} transform={`${mirror ? "translate(200 0) scale(-1 1) " : ""}${rot ? `rotate(${rot} ${cx} ${cy})` : ""}`.trim() || undefined} />; }
    return <path key={k} {...common} d={s.d} />;
  };
  return (
    <figure className="m-0 min-w-0 flex-1">
      <svg viewBox="0 0 200 400" className="mx-auto block w-full max-w-[240px]" role="img" aria-label={`${title} view of the body. Muscles are shaded by how many sets you did recently.`}>
        <circle cx="100" cy="28" r="17" fill="var(--sk-light)" stroke="var(--sk-line)" strokeWidth="1.2" />
        <ellipse cx="38" cy="196" rx="6" ry="9" fill="var(--sk-light)" stroke="var(--sk-line)" strokeWidth="1.2" />
        <ellipse cx="162" cy="196" rx="6" ry="9" fill="var(--sk-light)" stroke="var(--sk-line)" strokeWidth="1.2" />
        <ellipse cx="76" cy="384" rx="10" ry="6" fill="var(--sk-light)" stroke="var(--sk-line)" strokeWidth="1.2" />
        <ellipse cx="124" cy="384" rx="10" ry="6" fill="var(--sk-light)" stroke="var(--sk-line)" strokeWidth="1.2" />
        {shapes.flatMap((s) => (s.side ? [node(s, `${s.m}-l`, false), node(s, `${s.m}-r`, true)] : [node(s, s.m, false)]))}
      </svg>
      <figcaption className="mt-1 text-center text-xs font-bold uppercase tracking-wide opacity-60">{title}</figcaption>
    </figure>
  );
}

const sets = (n: number) => `${Math.round(n * 10) / 10} set${n === 1 ? "" : "s"}`;

export function MuscleMap({ stats }: { stats: TrainingStats }) {
  const [win, setWin] = useState<"d7" | "d30">("d7");
  const [sel, setSel] = useState<string | null>(null);
  const [flat, setFlat] = useState(false); // WebGL missing: fall back to the flat drawing
  const target = win === "d7" ? 10 : 40; // about 10 hard sets a week is a solid dose for a muscle
  const val = (m: string) => stats.muscles[m]?.[win] ?? 0;
  const level = (m: string) => Math.min(1, val(m) / target);
  const levels = useMemo(() => Object.fromEntries(ALL.map((m) => [m, level(m)])), [stats, win]); // eslint-disable-line react-hooks/exhaustive-deps
  const fill = (m: string) => (val(m) > 0 ? `color-mix(in srgb, var(--sk-accent) ${Math.round(22 + level(m) * 73)}%, var(--sk-light))` : "var(--sk-light)");
  const rows = useMemo(() => [...ALL].sort((a, b) => val(b) - val(a) || LABEL[a].localeCompare(LABEL[b])), [stats, win]); // eslint-disable-line react-hooks/exhaustive-deps
  const quiet = ALL.filter((m) => val(m) === 0 && m !== "neck");
  const total = win === "d7" ? stats.sets7 : stats.sets30;
  const cur = sel ? stats.muscles[sel] ?? { d7: 0, d30: 0 } : null;

  if (!stats.sets30) {
    return (
      <div className="card p-8 text-center" data-testid="muscle-empty">
        <p className="font-secondary text-xl font-bold">Your muscle map is waiting</p>
        <p className="mx-auto mt-1 max-w-md text-text-light dark:text-darkmode-text-light">Finish a workout and the muscles you trained light up here, so you can see what you are missing.</p>
        <Link href="/workouts" className="btn btn-primary mt-4">Go to workouts</Link>
      </div>
    );
  }
  return (
    <div className="space-y-5" data-testid="muscle-map">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Time window">
        <button className={pill(win === "d7")} aria-pressed={win === "d7"} onClick={() => setWin("d7")}>Last 7 days</button>
        <button className={pill(win === "d30")} aria-pressed={win === "d30"} onClick={() => setWin("d30")}>Last 30 days</button>
        <span className="ml-auto text-sm opacity-70" data-testid="muscle-total">{sets(total)} logged</span>
      </div>

      <div className="card p-4">
        {flat ? (
          <div className="flex gap-2 sm:gap-6">
            <Figure title="Front" shapes={FRONT} fill={fill} sel={sel} onPick={setSel} />
            <Figure title="Back" shapes={BACK} fill={fill} sel={sel} onPick={setSel} />
          </div>
        ) : (
          <Body3D levels={levels} sel={sel} onPick={setSel} onUnsupported={() => setFlat(true)} label="3D body. Muscles are shaded by how many sets you did recently" />
        )}
        <div className="mt-3 flex items-center justify-center gap-2 text-xs opacity-70" aria-hidden>
          <span>None</span>
          <span className="h-2.5 w-28 rounded-full" style={{ background: "linear-gradient(90deg, var(--sk-light), var(--sk-accent))" }} />
          <span>{target}+ sets</span>
        </div>
        <div className="mt-3 min-h-[3.25rem] rounded-xl bg-[color:var(--sk-light)] px-4 py-3 text-sm" aria-live="polite" data-testid="muscle-detail">
          {sel && cur ? (
            <p><b>{LABEL[sel]}</b>: {sets(cur.d7)} this week, {sets(cur.d30)} in 30 days. {cur.d30 === 0 ? "Not trained in the last 30 days." : cur.d7 === 0 ? "Not hit this week." : cur.d7 >= 10 ? "Plenty this week." : "Room for a bit more this week."}</p>
          ) : <p className="opacity-70">Tap a muscle to see its sets. A main muscle counts one set per set you do, a helper muscle counts half.</p>}
        </div>
      </div>

      {quiet.length > 0 && (
        <p className="text-sm" data-testid="muscle-quiet"><b>Not hit {win === "d7" ? "this week" : "in 30 days"}:</b> {quiet.map((m) => LABEL[m]).join(", ")}.</p>
      )}

      <ul className="card divide-y divide-[color:var(--sk-line)] p-0" aria-label="Sets per muscle">
        {rows.map((m) => (
          <li key={m}>
            <button type="button" onClick={() => setSel(m)} aria-pressed={sel === m} className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
              <span className="w-28 shrink-0 text-sm font-semibold">{LABEL[m]}</span>
              <span className="h-2 grow overflow-hidden rounded-full bg-[color:var(--sk-light)]"><span className="block h-full rounded-full bg-[color:var(--sk-accent)] transition-[width] duration-500" style={{ width: `${Math.round(level(m) * 100)}%` }} /></span>
              <span className="w-16 shrink-0 text-right text-sm tabular-nums">{sets(val(m))}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Strength vs bodyweight ---------------- */
const BIG = [
  { re: /squat/i, not: /split|front|goblet|overhead|hack|jump|box|zercher|sissy/i, label: "Squat" },
  { re: /bench press/i, not: /incline|decline|dumbbell|close|reverse|wide/i, label: "Bench press" },
  { re: /deadlift/i, not: /romanian|stiff|sumo|single|snatch|dumbbell|trap|straight|rack|suitcase/i, label: "Deadlift" },
  { re: /(military|overhead|shoulder) press/i, not: /dumbbell|arnold|seated|machine|behind|push|single|kettle/i, label: "Overhead press" },
];

export function Strength({ stats, body }: { stats: TrainingStats; body: BodyData }) {
  const { units } = body;
  const [mode, setMode] = useState<"weight" | "ratio">("weight");
  const [pick, setPick] = useState<string | null>(null);

  const bw = useMemo(() => {
    const list = body.weights.map((w) => ({ at: dayMs(w.day), kg: w.kg })).sort((a, b) => a.at - b.at);
    return (at: number): number | null => {
      if (!list.length) return stats.profileKg;
      let out = list[0].kg;
      for (const w of list) { if (w.at <= at + 86_400_000) out = w.kg; else break; }
      return out;
    };
  }, [body.weights, stats.profileKg]);
  const canRatio = bw(Date.now()) != null;

  const featured = useMemo(() => BIG.map((b) => ({ ...b, lift: stats.lifts.find((l) => b.re.test(l.name) && !b.not.test(l.name)) })).filter((b) => b.lift), [stats.lifts]);
  const id = pick ?? featured[0]?.lift?.id ?? stats.lifts[0]?.id ?? null;
  const lift = stats.lifts.find((l) => l.id === id) ?? null;

  if (!stats.lifts.length) {
    return (
      <div className="card p-8 text-center" data-testid="strength-empty">
        <p className="font-secondary text-xl font-bold">No lifts to chart yet</p>
        <p className="mx-auto mt-1 max-w-md text-text-light dark:text-darkmode-text-light">Finish a workout with weight and reps on an exercise and your estimated one-rep max shows up here.</p>
        <Link href="/workouts" className="btn btn-primary mt-4">Go to workouts</Link>
      </div>
    );
  }
  const ratioOf = (at: number, kg: number) => { const b = bw(at); return b ? Math.round((kg / b) * 100) / 100 : null; };
  const pts = lift ? lift.points.map((p) => ({ at: p.at, value: mode === "ratio" ? ratioOf(p.at, p.kg) ?? 0 : toDisplay(p.kg, units) ?? 0 })) : [];
  const cardFor = (l: NonNullable<(typeof featured)[number]["lift"]>) => {
    const last = l.points.at(-1)!; const r = ratioOf(last.at, last.kg);
    return { w: toDisplay(last.kg, units)!, r };
  };

  return (
    <div className="space-y-5" data-testid="strength">
      {featured.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {featured.map((f) => {
            const c = cardFor(f.lift!);
            return (
              <button key={f.label} type="button" onClick={() => setPick(f.lift!.id)} aria-pressed={id === f.lift!.id}
                className={`card p-4 text-left transition ${id === f.lift!.id ? "ring-2 ring-[color:var(--sk-accent)]" : ""}`} data-testid={`big-${f.label.split(" ")[0].toLowerCase()}`}>
                <p className="text-xs font-bold uppercase tracking-wide opacity-60">{f.label}</p>
                <p className="font-secondary text-2xl font-extrabold tabular-nums">{c.w}<span className="ml-1 text-sm font-semibold opacity-70">{units}</span></p>
                <p className="text-sm tabular-nums opacity-80">{c.r != null ? `${c.r}× bodyweight` : "Add your weight for a ratio"}</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="card space-y-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 grow">
            <label htmlFor="lift-pick" className="mb-1 block text-sm font-semibold">Exercise</label>
            <select id="lift-pick" className="form-input w-full" value={id ?? ""} onChange={(e) => setPick(e.target.value)}>
              {stats.lifts.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.sessions})</option>)}
            </select>
          </div>
          <div className="flex gap-2" role="group" aria-label="Chart type">
            <button className={pill(mode === "weight")} aria-pressed={mode === "weight"} onClick={() => setMode("weight")}>Weight</button>
            <button className={pill(mode === "ratio")} aria-pressed={mode === "ratio"} disabled={!canRatio} onClick={() => setMode("ratio")}>× Bodyweight</button>
          </div>
        </div>
        {lift && pts.length > 0 && <ProgressChart digits={mode === "ratio" ? 2 : 1} points={pts} unit={mode === "ratio" ? "× bw" : units} label={`${lift.name} estimated 1RM`} />}
        <p className="text-xs opacity-70">Estimated one-rep max from your best set in each finished workout (Epley formula, reps capped at 12). The ratio divides it by the weight you logged closest before that workout.{!canRatio && " Log your body weight to unlock the ratio."}</p>
      </div>
    </div>
  );
}
