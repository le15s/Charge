import { startWorkout } from "@/app/actions/workouts";
import { PageHeader } from "@/components/SectionHeaders";
import Celebrate from "@/components/Celebrate";
import DeleteWorkoutButton from "@/components/DeleteWorkoutButton";
import { db } from "@/db";
import { workout, workoutExercise, workoutSet } from "@/db/schema";
import { EXERCISE_BY_ID, isTimed } from "@/lib/exercises";
import { requireOnboarded } from "@/lib/session";
import { fmtWeight, toDisplay, type Units } from "@/lib/units";
import { listRoutines } from "@/lib/workouts";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

export const metadata = { title: "History" };

const dur = (a: Date, b: Date | null) => { if (!b) return ""; const m = Math.round((b.getTime() - a.getTime()) / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };

export default async function History({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { done } = await searchParams;
  const { user, profile } = await requireOnboarded();
  const units = (profile.units === "lb" ? "lb" : "kg") as Units;
  const [list, routines] = await Promise.all([
    db.select().from(workout).where(and(eq(workout.userId, user.id), eq(workout.status, "finished"))).orderBy(desc(workout.startedAt)).limit(60),
    listRoutines(user.id),
  ]);
  const exs = list.length ? await db.select().from(workoutExercise).where(inArray(workoutExercise.workoutId, list.map((w) => w.id))).orderBy(asc(workoutExercise.position)) : [];
  const sets = exs.length ? await db.select().from(workoutSet).where(and(inArray(workoutSet.workoutExerciseId, exs.map((e) => e.id)), eq(workoutSet.done, true))).orderBy(asc(workoutSet.position)) : [];

  // group the workouts by month, newest first (the logbook has a stamp for every month)
  const months: { key: string; label: string; volume: number; items: { w: (typeof list)[number]; wex: typeof exs; wsets: typeof sets; volume: number }[] }[] = [];
  for (const w of list) {
    const wex = exs.filter((e) => e.workoutId === w.id);
    const wsets = sets.filter((st) => wex.some((e) => e.id === st.workoutExerciseId));
    const volume = wsets.filter((st) => st.kind !== "warmup").reduce((a, st) => a + (st.weightKg ?? 0) * (st.reps ?? 0), 0);
    const key = `${w.startedAt.getFullYear()}-${w.startedAt.getMonth()}`;
    let g = months.find((m) => m.key === key);
    if (!g) { g = { key, label: w.startedAt.toLocaleDateString("en-US", { month: "long", year: "numeric" }), volume: 0, items: [] }; months.push(g); }
    g.items.push({ w, wex, wsets, volume }); g.volume += volume;
  }

  return (
    <div>
      {done && <Celebrate title="Workout saved" text="Nice work. It is in your history now." />}
      <PageHeader title="History" tone="steel">Every finished workout, with the weights and reps you logged.</PageHeader>
      {!list.length ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center dark:border-darkmode-border"><h2 className="h4 mb-2">Nothing here yet</h2><p>Finish your first workout and it will show up here.</p></div>
      ) : (
        <div className="ledger-page">
          {months.map((g) => (
            <section key={g.key} className="mb-6" aria-label={g.label}>
              <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <h2 className="month-stamp">{g.label}</h2>
                <p className="font-typewriter text-sm text-text-light dark:text-darkmode-text-light">{g.items.length} workout{g.items.length > 1 ? "s" : ""} · {fmtWeight(g.volume, units)} lifted</p>
              </div>
              <ol className="log-rail">
                {g.items.map(({ w, wex, wsets, volume }) => {
                  const canRepeat = !!w.routineId && routines.some((r) => r.id === w.routineId);
                  return (
                    <li key={w.id} className="log-entry">
                      <div className="log-date" aria-hidden><b>{w.startedAt.getDate()}</b><span>{w.startedAt.toLocaleDateString("en-US", { weekday: "short" })}</span><i /></div>
                      <article className="log-body">
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="h5">{w.name}</h3>
                            <p className="font-typewriter text-[13px] text-text-light dark:text-darkmode-text-light">{w.startedAt.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}{dur(w.startedAt, w.finishedAt) && ` · ${dur(w.startedAt, w.finishedAt)}`} · {wsets.length} sets · {fmtWeight(volume, units)} lifted</p>
                          </div>
                          <div className="flex items-center gap-4">
                            {canRepeat && <form action={startWorkout.bind(null, w.routineId)}><button className="btn btn-outline-primary btn-sm">Do it again</button></form>}
                            <DeleteWorkoutButton id={w.id} />
                          </div>
                        </div>
                        <ul className="space-y-2.5">
                          {wex.map((e) => (
                            <li key={e.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5" data-testid="hist-ex">
                              <span className="min-w-0 text-base font-semibold text-text-dark dark:text-darkmode-text-dark">{EXERCISE_BY_ID[e.exerciseId]?.name ?? e.exerciseId}</span>
                              <span className="log-sets flex flex-wrap gap-x-3 text-base tabular-nums text-text dark:text-darkmode-text">{wsets.filter((st) => st.workoutExerciseId === e.id).map((st, i) => <span key={i} className="whitespace-nowrap">{isTimed(e.exerciseId) ? `${st.reps ?? 0}s` : `${toDisplay(st.weightKg ?? 0, units)}×${st.reps ?? 0}`}</span>)}</span>
                            </li>
                          ))}
                        </ul>
                        {w.notes && <p className="mt-3 text-sm italic">{w.notes}</p>}
                      </article>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
