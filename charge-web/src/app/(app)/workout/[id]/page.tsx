import { listMusic } from "@/lib/music-db";
import WorkoutTracker, { type TWorkout } from "@/components/WorkoutTracker";
import { toLite } from "@/lib/exercises";
import { requireOnboarded } from "@/lib/session";
import { toDisplay, type Units } from "@/lib/units";
import { earlierPerformances, getWorkout, lastPerformance } from "@/lib/workouts";
import { notFound, redirect } from "next/navigation";

export const metadata = { title: "Workout" };

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, profile } = await requireOnboarded();
  const w = await getWorkout(user.id, id);
  if (!w) notFound();
  if (w.status === "finished") redirect("/history");
  const units = (profile.units === "lb" ? "lb" : "kg") as Units;
  const exIds = [...new Set(w.exercises.map((e) => e.exerciseId))];
  const [prev, earlier, music] = await Promise.all([lastPerformance(user.id, exIds), earlierPerformances(user.id, exIds), listMusic(user.id)]);
  const data: TWorkout = {
    id: w.id, name: w.name, startedAt: w.startedAt.getTime(),
    exercises: w.exercises.map((e) => ({
      id: e.id, exerciseId: e.exerciseId, lite: toLite(e.exerciseId), restSeconds: e.restSeconds, repsMin: e.repsMin ?? 8, repsMax: e.repsMax ?? 12, note: e.note ?? "",
      prev: prev[e.exerciseId] ?? [], earlier: earlier[e.exerciseId] ?? [],
      sets: e.sets.map((s) => ({ id: s.id, kind: s.kind, weight: s.weightKg == null ? "" : String(toDisplay(s.weightKg, units)), reps: s.reps == null ? "" : String(s.reps), done: s.done })),
    })),
  };
  return <WorkoutTracker music={music} initial={data} units={units} defaultRest={profile.restSeconds} prefs={{ soundEnabled: profile.soundEnabled, vibrationEnabled: profile.vibrationEnabled, soundVolume: profile.soundVolume, keepAwake: profile.keepAwake }} />;
}
