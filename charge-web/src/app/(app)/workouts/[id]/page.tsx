import RoutineEditor from "@/components/RoutineEditor";
import { toLite } from "@/lib/exercises";
import { requireOnboarded } from "@/lib/session";
import { plateColors } from "@/lib/plates";
import { getRoutine, listRoutines } from "@/lib/workouts";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "Edit workout" };

export default async function EditWorkout({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireOnboarded();
  const [r, all] = await Promise.all([getRoutine(user.id, id), listRoutines(user.id)]);
  if (!r) notFound();
  const color = plateColors(all).get(r.id) ?? 0;
  return (
    <div className="max-w-3xl">
      <Link href="/workouts" className="mb-4 inline-block text-sm underline">← My workouts</Link>
      <RoutineEditor routineId={r.id} initialName={r.name} initialColor={color} initialExercises={r.exercises.map((e) => ({ id: e.id, exerciseId: e.exerciseId, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax, restSeconds: e.restSeconds, lite: toLite(e.exerciseId) }))} />
    </div>
  );
}
