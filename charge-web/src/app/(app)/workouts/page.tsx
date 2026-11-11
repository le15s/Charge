import { startWorkout } from "@/app/actions/workouts";
import CycleBoard from "@/components/CycleBoard";
import { PageHeader } from "@/components/SectionHeaders";
import OpenAssistantButton from "@/components/OpenAssistantButton";
import { EXERCISE_BY_ID } from "@/lib/exercises";
import { requireOnboarded } from "@/lib/session";
import { plateColors, plateVar } from "@/lib/plates";
import { estimateMinutes } from "@/lib/splits";
import { agoText, listRoutines, routineReadiness } from "@/lib/workouts";
import { cycleClashes, fmtHours, GROUP_LABEL, groupList, loadOf } from "@/lib/recovery";
import Link from "next/link";
import GoalFit from "@/components/GoalFit";
import { analyzeWorkout } from "@/lib/analyze-workout";

export const metadata = { title: "My workouts" };

export default async function Workouts() {
  const { user, profile } = await requireOnboarded();
  const routines = await listRoutines(user.id);
  const colors = plateColors(routines);
  // the rolling rotation, as on Home: routines in the order you cycle through them
  const byId = new Map(routines.map((r) => [r.id, r]));
  const rot = (profile.rotation ?? []).map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r);
  const pos = rot.length ? Math.min(profile.rotationPos, rot.length - 1) : 0;
  const nextId = rot.length ? rot[pos]?.id : routines[0]?.id;
  const ready = await routineReadiness(user.id, routines);
  // does the saved cycle ever train the same muscles two sessions in a row (including the jump from the last session back to the first)?
  const clashes = cycleClashes(rot.map((r) => ({ name: r.name, load: loadOf(r.exercises) })));
  const allFull = rot.length >= 2 && clashes.length >= (rot.length === 2 ? 1 : rot.length);
  const fit = new Map(routines.map((r) => [r.id, analyzeWorkout({ goal: profile.goal, level: profile.experience, limits: profile.limits, exercises: r.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax, restSeconds: e.restSeconds })) })]));
  const fitWorkouts = (rot.length ? rot : routines).map((r) => ({ name: r.name, exercises: r.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax, restSeconds: e.restSeconds })) }));
  return (
    <div>
      <PageHeader title="My workouts" tone="red" action={<><OpenAssistantButton className="btn btn-outline-primary">Ask the assistant</OpenAssistantButton><Link href="/programs" className="btn btn-outline-primary">Programs</Link><Link href="/workouts/new" className="btn btn-primary">New workout</Link></>}>Create as many routines as you need.</PageHeader>
      {rot.length >= 2 && clashes.length > 0 && (
        <aside role="note" data-testid="cycle-warning" className="mb-6 rounded-2xl border-2 border-amber-500/60 bg-amber-500/10 p-4 text-sm">
          {allFull ? (
            <p><b>Leave a rest day between sessions.</b> Every workout in this cycle trains most of your body, so a muscle usually needs about 48 hours before it works hard again (a rule of thumb: some people recover faster, some slower).</p>
          ) : (
            <>
              <p className="mb-1 font-semibold">Some of these workouts hit the same muscles back to back</p>
              <ul className="mb-2 list-disc pl-5">{clashes.slice(0, 3).map((c, i) => <li key={i}>{c.from} then {c.to}: {groupList(c.groups)}</li>)}</ul>
              <p>Muscles grow while they rest, so it works better when the next session uses different ones. <OpenAssistantButton className="underline">Let the assistant rebuild your cycle</OpenAssistantButton>.</p>
            </>
          )}
        </aside>
      )}
      {fitWorkouts.some((w) => w.exercises.length) && <GoalFit className="mb-6" title="Your workouts and your goal" workouts={fitWorkouts} />}
      <CycleBoard steps={rot.map((r) => ({ id: r.id, name: r.name, color: colors.get(r.id) ?? -1 }))} pos={pos} />
      {!routines.length ? (
        <div className="card p-12 text-center">
          <h2 className="font-secondary mb-2 text-3xl font-extrabold uppercase tracking-wide">No workouts yet</h2>
          <p className="mb-6">Build one yourself, or let the assistant propose a plan based on your profile.</p>
          <div className="flex flex-wrap justify-center gap-3"><OpenAssistantButton>Build with the assistant</OpenAssistantButton><Link href="/workouts/new" className="btn btn-outline-primary">Create manually</Link></div>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {routines.map((r, i) => (
            <li key={r.id} data-next={r.id === nextId ? "true" : undefined} className={`card flex flex-col p-5 ${r.id === nextId ? "!border-primary dark:!border-darkmode-primary" : ""}`}>
              <div className="mb-2 flex items-start gap-3">
                <span aria-hidden className="mt-1.5 h-4 w-4 shrink-0 rounded-full ring-2 ring-inset ring-black/15" style={{ background: plateVar(colors.get(r.id) ?? -1) }} />
                <h2 className="font-secondary min-w-0 grow text-[1.7rem] font-extrabold uppercase leading-tight tracking-wide">{r.name}</h2>
                {r.id === nextId && <span aria-label="Up next" className="shrink-0 rounded bg-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--sk-ink)] dark:bg-darkmode-primary">Up next</span>}
                {r.source === "assistant" && <span className="shrink-0 rounded bg-light px-2 py-0.5 text-xs dark:bg-darkmode-light">Assistant</span>}
              </div>
              <p className="mb-1 text-sm tabular-nums text-text-light dark:text-darkmode-text-light">{r.exercises.length} exercises · {r.exercises.reduce((a, e) => a + e.sets, 0)} sets{r.exercises.length ? ` · about ${estimateMinutes(r.exercises.map((e) => ({ sets: e.sets, restSeconds: e.restSeconds ?? profile.restSeconds })))} min` : ""}</p>
              <p className="mb-2 text-sm font-semibold" data-testid="last-done">{agoText(ready.last[r.id])}</p>
              {r.exercises.length > 0 && (() => { const a = fit.get(r.id)!; const w = a.findings.filter((f) => f.level === "warn").length; const t = a.findings.filter((f) => f.level === "tip").length; return (
                <Link href={`/workouts/${r.id}`} data-testid="fit-chip" data-verdict={a.verdict} className={`mb-3 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${a.verdict === "fits" ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" : a.verdict === "mostly" ? "bg-amber-500/15 text-amber-900 dark:text-amber-200" : "bg-red-500/15 text-red-800 dark:text-red-300"}`}>
                  <span aria-hidden className={`h-2 w-2 rounded-full ${a.verdict === "fits" ? "bg-emerald-500" : a.verdict === "mostly" ? "bg-amber-500" : "bg-red-500"}`} />{a.label}{w ? ` · ${w} warning${w > 1 ? "s" : ""}` : t ? ` · ${t} tip${t > 1 ? "s" : ""}` : ""}
                </Link>); })()}
              {ready.waiting[r.id]?.length > 0 && (
                <p className="mb-3 rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm text-amber-900 dark:text-amber-200" data-testid="recovering">
                  Still recovering: {ready.waiting[r.id].slice(0, 3).map((w) => GROUP_LABEL[w.group].toLowerCase()).join(", ")}. About {fmtHours(ready.waiting[r.id][0].hours)} to go (a rule of thumb: about 48 h for big muscles).
                </p>
              )}
              <p className="mb-5 grow text-sm">{r.exercises.slice(0, 4).map((e) => EXERCISE_BY_ID[e.exerciseId]?.name).filter(Boolean).join(", ")}{r.exercises.length > 4 ? "…" : ""}</p>
              <div className="flex gap-3">
                <form action={startWorkout.bind(null, r.id)}><button className="btn btn-primary btn-sm" disabled={!r.exercises.length}>Start</button></form>
                <Link href={`/workouts/${r.id}`} className="btn btn-outline-primary btn-sm">Edit</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
