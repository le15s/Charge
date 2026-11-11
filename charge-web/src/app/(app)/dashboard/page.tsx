import { startWorkout } from "@/app/actions/workouts";
import { PlateMark, SectionTitle } from "@/components/Decor";
import Barbell from "@/components/Barbell";
import CountUp from "@/components/CountUp";
import LevelUpCard from "@/components/LevelUpCard";
import OpenAssistantButton from "@/components/OpenAssistantButton";
import { OpenWeight } from "@/components/QuickWeight";
import RecentWorkouts, { type RecentRow } from "@/components/RecentWorkouts";
import TourCard from "@/components/TourCard";
import { db } from "@/db";
import { stockItem, workout, workoutExercise, workoutSet } from "@/db/schema";
import { EXERCISE_BY_ID } from "@/lib/exercises";
import { calcTargets } from "@/lib/nutrition";
import { requireOnboarded } from "@/lib/session";
import { colorOfWorkout, plateColors, plateVar } from "@/lib/plates";
import { retailerLink, retailerName, stockStatus, fmtQty, type StockRow } from "@/lib/stock";
import { toDisplay, type Units } from "@/lib/units";
import { fmtHours, GROUP_LABEL } from "@/lib/recovery";
import { agoText, listRoutines, routineReadiness } from "@/lib/workouts";
import { and, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";

export const metadata = { title: "Home" };


function whenLabel(d: Date) {
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { user, profile } = await requireOnboarded();
  const units = (profile.units === "lb" ? "lb" : "kg") as Units;
  // three independent reads: ask for them together instead of one after the other
  const [routines, finished, stock] = await Promise.all([
    listRoutines(user.id),
    db.select().from(workout).where(and(eq(workout.userId, user.id), eq(workout.status, "finished"))).orderBy(desc(workout.startedAt)),
    db.select().from(stockItem).where(eq(stockItem.userId, user.id)) as unknown as Promise<StockRow[]>,
  ]);
  const colors = plateColors(routines);

  const now = Date.now();
  const inDays = (n: number) => finished.filter((w) => w.startedAt.getTime() >= now - n * 864e5);
  const week = inDays(7), month = inDays(30), fourWeeks = inDays(28);
  const perWeek = fourWeeks.length / 4;

  // sets + volume of the 15 latest workouts (and of the last 30 days for the stats)
  const latest = finished.slice(0, 15);
  const wanted = [...new Map([...latest, ...month].map((w) => [w.id, w])).values()];
  const exs = wanted.length ? await db.select().from(workoutExercise).where(inArray(workoutExercise.workoutId, wanted.map((w) => w.id))) : [];
  const sets = exs.length ? await db.select().from(workoutSet).where(and(inArray(workoutSet.workoutExerciseId, exs.map((e) => e.id)), eq(workoutSet.done, true))) : [];
  const vol = (wid: string) => {
    const ids = new Set(exs.filter((e) => e.workoutId === wid).map((e) => e.id));
    return sets.filter((s) => ids.has(s.workoutExerciseId) && s.kind !== "warmup").reduce((a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
  };
  const monthVolume = month.reduce((a, w) => a + vol(w.id), 0);
  const rows: RecentRow[] = latest.map((w) => {
    const wex = exs.filter((e) => e.workoutId === w.id);
    const ids = new Set(wex.map((e) => e.id));
    const names = wex.map((e) => EXERCISE_BY_ID[e.exerciseId]?.name).filter(Boolean) as string[];
    const v = toDisplay(vol(w.id), units) ?? 0;
    return {
      id: w.id, name: w.name, when: whenLabel(w.startedAt), color: colorOfWorkout(w.routineId, colors),
      minutes: w.finishedAt ? Math.max(1, Math.round((w.finishedAt.getTime() - w.startedAt.getTime()) / 60000)) : null,
      sets: sets.filter((s) => ids.has(s.workoutExerciseId)).length, volume: `${Math.round(v).toLocaleString("en-US")} ${units}`,
      exercises: names.slice(0, 3).join(", ") + (names.length > 3 ? ` +${names.length - 3}` : ""),
    };
  });

  // next workout in the rolling rotation (falls back to the list order)
  const byId = new Map(routines.map((r) => [r.id, r]));
  const rot = (profile.rotation ?? []).map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r);
  const useRot = rot.length > 0;
  const seq = useRot ? rot : routines;
  const pos = useRot ? Math.min(profile.rotationPos, seq.length - 1) : (() => { const last = finished.find((w) => w.routineId && byId.has(w.routineId))?.routineId; return seq.length ? (Math.max(seq.findIndex((r) => r.id === last), -1) + 1) % seq.length : 0; })();
  const next = seq[pos] ?? null;
  const ready = next ? await routineReadiness(user.id, [next]) : null;

  const alerts = stock.map((it) => ({ it, st: stockStatus(it) })).filter((x) => x.st.needsOrder).sort((a, b) => a.st.daysLeft - b.st.daysLeft);

  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : 30;
  const targets = profile.weightKg && profile.heightCm ? calcTargets({ weightKg: profile.weightKg, heightCm: profile.heightCm, age, gender: profile.gender ?? "male", activity: profile.activity ?? 1.375, goal: profile.goal ?? "maintain" }) : null;
  const plates = week.slice().reverse().map((w) => colorOfWorkout(w.routineId, colors));

  return (
    <div className="space-y-8">
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <PlateMark tone="red" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 opacity-[0.09] dark:opacity-[0.13]" />
        <PlateMark tone="blue" className="pointer-events-none absolute -bottom-28 -left-24 h-64 w-64 opacity-[0.06] dark:opacity-[0.09]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="h2 mb-1">Hi, @{profile.displayName ?? user.name}</h1>
            <p className="text-text-light dark:text-darkmode-text-light">
              {week.length === 0 ? "No workout logged in the last 7 days. Load the bar whenever you're ready." : `${week.length} workout${week.length > 1 ? "s" : ""} in the last 7 days.`}
              {fourWeeks.length >= 3 && ` Your pace: about ${perWeek.toFixed(1).replace(/\.0$/, "")} a week.`}
            </p>
          </div>
          <div className="flex gap-3 text-right">
            <div className="rounded-2xl bg-light/80 px-4 py-3 dark:bg-darkmode-light/70"><p className="font-secondary text-4xl font-black leading-none text-text-dark dark:text-darkmode-text-dark"><CountUp to={month.length} /></p><p className="text-xs text-text-light dark:text-darkmode-text-light">workouts, 30 days</p></div>
            <div className="rounded-2xl bg-light/80 px-4 py-3 dark:bg-darkmode-light/70"><p className="font-secondary text-4xl font-black leading-none text-text-dark dark:text-darkmode-text-dark"><CountUp to={toDisplay(monthVolume, units) ?? 0} /></p><p className="text-xs text-text-light dark:text-darkmode-text-light">{units} lifted, 30 days</p></div>
          </div>
        </div>
        <div className="relative mx-auto mt-6 max-w-2xl"><Barbell plates={plates} label={`${week.length} workouts in the last 7 days`} /></div>
        <p className="relative mt-1 text-center text-xs text-text-light dark:text-darkmode-text-light">One pair of plates per workout this week. Every workout has its own colour.</p>
      </section>

      {profile.levelNotice && <LevelUpCard level={profile.levelNotice} />}

      {(!profile.tourDismissed || welcome) && <TourCard name={profile.displayName ?? ""} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card relative overflow-hidden p-6 lg:col-span-2">
          {next && <PlateMark color={colors.get(next.id)} className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 opacity-[0.12] dark:opacity-[0.16]" />}
          {next ? (
            <>
              <p className="mb-1 text-sm font-semibold text-primary dark:text-darkmode-primary">Up next</p>
              <h2 className="h3 mb-2">{next.name}</h2>
              {ready && (
                <p className="mb-2 text-sm text-text-light dark:text-darkmode-text-light" data-testid="next-last-done">{agoText(ready.last[next.id])}</p>
              )}
              {ready && ready.waiting[next.id]?.length > 0 && (
                <p className="mb-3 rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm text-amber-900 dark:text-amber-200" data-testid="next-recovering">
                  Still recovering: {ready.waiting[next.id].slice(0, 3).map((w) => GROUP_LABEL[w.group].toLowerCase()).join(", ")}. About {fmtHours(ready.waiting[next.id][0].hours)} to go (a rule of thumb: about 48 h for big muscles).
                </p>
              )}
              <p className="mb-4">{next.exercises.slice(0, 4).map((e) => EXERCISE_BY_ID[e.exerciseId]?.name).filter(Boolean).join(" · ")}{next.exercises.length > 4 ? ` · +${next.exercises.length - 4} more` : ""}</p>
              {seq.length > 1 && (
                <ol className="mb-5 flex flex-wrap items-center gap-2 text-sm" aria-label="Your rotation">
                  {seq.map((r, i) => (
                    <li key={r.id} className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 font-semibold ${i === pos ? "bg-primary text-white dark:bg-darkmode-primary dark:text-text-dark" : "bg-light dark:bg-darkmode-light"}`}><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/60" style={{ background: plateVar(colors.get(r.id) ?? -1) }} />{r.name}</span>
                      {i < seq.length - 1 && <span aria-hidden className="text-text-light">›</span>}
                    </li>
                  ))}
                  <li aria-hidden className="text-text-light">↻ then it starts over</li>
                </ol>
              )}
              <div className="flex flex-wrap gap-3">
                <form action={startWorkout.bind(null, next.id)}><button className="btn btn-primary">Start workout</button></form>
                <Link href="/workouts" className="btn btn-outline-primary">All workouts</Link>
                <form action={startWorkout.bind(null, null)}><button className="btn btn-outline-primary">Empty workout</button></form>
              </div>
            </>
          ) : (
            <>
              <h2 className="h3 mb-2">You don&apos;t have any workouts yet</h2>
              <p className="mb-5">Create one yourself or let the assistant build a rotation from your profile.</p>
              <div className="flex flex-wrap gap-3"><OpenAssistantButton>Build with the assistant</OpenAssistantButton><Link href="/workouts/new" className="btn btn-outline-primary">Create manually</Link></div>
            </>
          )}
        </section>

        <section className="card p-6">
          <p className="mb-3 text-sm font-semibold text-text-light dark:text-darkmode-text-light">Body weight</p>
          <p className="font-secondary text-5xl font-black leading-none text-text-dark dark:text-darkmode-text-dark">{profile.weightKg ? <CountUp to={toDisplay(profile.weightKg, units) ?? 0} decimals={1} /> : "—"}<span className="ml-1 text-xl font-bold text-text-light">{units}</span></p>
          <div className="mt-4 flex flex-wrap items-center gap-3"><OpenWeight>{profile.weightKg ? "Change weight" : "Log weight"}</OpenWeight><Link href="/body" className="text-sm font-semibold underline">Weight chart</Link></div>
        </section>

        {alerts.length > 0 && (
          <section className="card p-6 lg:col-span-3">
            <div className="mb-3 flex items-center justify-between"><h2 className="h5">Time to reorder</h2><Link href="/stock" className="text-sm font-semibold text-primary dark:text-darkmode-primary">Open Stock</Link></div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {alerts.slice(0, 3).map(({ it, st }) => (
                <li key={it.id} className="flex items-center justify-between gap-3 rounded-xl bg-light p-4 dark:bg-darkmode-light">
                  <div className="min-w-0"><p className="truncate font-semibold text-text-dark dark:text-darkmode-text-dark">{it.name}</p><p className="text-sm">{st.state === "out" ? "Out of stock" : `${Math.max(1, Math.ceil(st.daysLeft))} days left (${fmtQty(st.left)} ${it.unit})`}</p></div>
                  <a href={retailerLink(it)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm shrink-0">{retailerName(it.retailer)}</a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {targets && (
          <section className="card p-6 lg:col-span-3">
            <p className="mb-3 text-sm font-semibold text-text-light dark:text-darkmode-text-light">Your daily targets (estimate)</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[["Calories", `${targets.kcal}`], ["Protein", `${targets.protein} g`], ["Carbs", `${targets.carbs} g`], ["Fat", `${targets.fat} g`], ["Water", `${(targets.water / 1000).toFixed(1)} L`]].map(([k, v]) => (
                <div key={k}><p className="text-sm">{k}</p><p className="font-secondary text-3xl font-black text-text-dark dark:text-darkmode-text-dark">{v}</p></div>
              ))}
            </div>
          </section>
        )}
      </div>

      <section aria-labelledby="recent-h">
        <SectionTitle id="recent-h">Your last 15 workouts</SectionTitle>
        <RecentWorkouts rows={rows} />
      </section>
    </div>
  );
}
