import { getWave } from "@/app/actions/programs";
import ProgramsHub from "@/components/ProgramsHub";
import { PageHeader } from "@/components/SectionHeaders";
import { requireOnboarded } from "@/lib/session";
import type { Units } from "@/lib/units";
import { listRoutines } from "@/lib/workouts";

export const metadata = { title: "Programs" };

export default async function Programs({ searchParams }: { searchParams: Promise<{ import?: string }> }) {
  const { import: code } = await searchParams;
  const { user, profile } = await requireOnboarded();
  const [routines, wave] = await Promise.all([listRoutines(user.id), getWave()]);
  return (
    <div>
      <PageHeader title="Programs">Ready-made plans you can add to your workouts in one tap, and a way to share your own.</PageHeader>
      <ProgramsHub
        units={(profile.units === "lb" ? "lb" : "kg") as Units} wave={wave} initialCode={code ?? ""}
        routines={routines.map((r) => ({ id: r.id, name: r.name, exercises: r.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax, restSeconds: e.restSeconds ?? 90 })) }))}
      />
    </div>
  );
}
