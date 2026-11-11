import { db } from "@/db";
import { routine, workout, workoutExercise, routineExercise, workoutSet } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function ownsRoutine(userId: string, id: string) {
  const [r] = await db.select({ id: routine.id }).from(routine).where(and(eq(routine.id, id), eq(routine.userId, userId)));
  return !!r;
}
export async function ownsWorkout(userId: string, id: string) {
  const [r] = await db.select({ id: workout.id }).from(workout).where(and(eq(workout.id, id), eq(workout.userId, userId)));
  return !!r;
}
export async function routineIdOfExercise(userId: string, reId: string) {
  const [r] = await db.select({ rid: routineExercise.routineId, uid: routine.userId }).from(routineExercise).innerJoin(routine, eq(routine.id, routineExercise.routineId)).where(eq(routineExercise.id, reId));
  return r && r.uid === userId ? r.rid : null;
}
export async function workoutIdOfExercise(userId: string, weId: string) {
  const [r] = await db.select({ wid: workoutExercise.workoutId, uid: workout.userId }).from(workoutExercise).innerJoin(workout, eq(workout.id, workoutExercise.workoutId)).where(eq(workoutExercise.id, weId));
  return r && r.uid === userId ? r.wid : null;
}
export async function workoutIdOfSet(userId: string, setId: string) {
  const [r] = await db.select({ wid: workoutExercise.workoutId, uid: workout.userId }).from(workoutSet).innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId)).innerJoin(workout, eq(workout.id, workoutExercise.workoutId)).where(eq(workoutSet.id, setId));
  return r && r.uid === userId ? r.wid : null;
}
