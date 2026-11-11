import ExerciseLibrary from "@/components/ExerciseLibrary";
import { PageHeader } from "@/components/SectionHeaders";
import { requireOnboarded } from "@/lib/session";
import { listRoutines } from "@/lib/workouts";

export const metadata = { title: "Exercises" };

export default async function Exercises() {
  const { user } = await requireOnboarded();
  const routines = await listRoutines(user.id);
  return (
    <div>
      <PageHeader title="Exercises" tone="blue">Browse the library, see how each move is done, and add it to one of your workouts.</PageHeader>
      <ExerciseLibrary routines={routines.map((r) => ({ id: r.id, name: r.name }))} />
    </div>
  );
}
