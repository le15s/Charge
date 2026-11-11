import raw from "@/data/exercises.json";
import extras from "@/data/exercise-extras.json";

export type Exercise = {
  id: string;
  name: string;
  force: string | null;
  level: "beginner" | "intermediate" | "expert";
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  category: string;
  instructions: string[];
};

/** Light version that is safe to send to the browser. */
export type ExerciseLite = { id: string; name: string; muscles: string; equipment: string; level: string; timed: boolean };

type Raw = {
  id: string; name: string; force: string | null; level: Exercise["level"]; mechanic: string | null; equipment: string;
  primary: string[]; secondary: string[]; category: string; instructions: string[];
};

export const EXERCISES: Exercise[] = (raw as Raw[]).map((e) => ({
  id: e.id, name: e.name, force: e.force, level: e.level, mechanic: e.mechanic,
  equipment: e.equipment === "none" ? null : e.equipment,
  primaryMuscles: e.primary, secondaryMuscles: e.secondary, category: e.category, instructions: e.instructions,
}));
export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
export const EXERCISE_BY_NAME: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.name.toLowerCase(), e]));

export const equipmentKey = (e: Exercise) => e.equipment ?? "none";

/** Timed holds (planks etc.) are logged in seconds rather than reps. */
export const isTimed = (x: string | Exercise) => {
  const e = typeof x === "string" ? EXERCISE_BY_ID[x] : x;
  return !!e && ((e.force === "static" && e.category !== "stretching") || e.name === "Plank");
};

const MUSCLE: Record<string, string> = {
  abdominals: "Abs", abductors: "Abductors", adductors: "Adductors", biceps: "Biceps", calves: "Calves", chest: "Chest",
  forearms: "Forearms", glutes: "Glutes", hamstrings: "Hamstrings", lats: "Lats", "lower back": "Lower back",
  "middle back": "Middle back", neck: "Neck", quadriceps: "Quads", shoulders: "Shoulders", traps: "Traps", triceps: "Triceps",
};
const EQUIP: Record<string, string> = {
  barbell: "Barbell", dumbbell: "Dumbbell", cable: "Cable", machine: "Machine", "body only": "Bodyweight", kettlebells: "Kettlebell",
  bands: "Bands", "e-z curl bar": "EZ bar", other: "Other", "medicine ball": "Medicine ball", "exercise ball": "Exercise ball",
  "foam roll": "Foam roller", none: "No equipment",
};

export function toLite(id: string): ExerciseLite {
  const e = EXERCISE_BY_ID[id];
  if (!e) return { id, name: id, muscles: "", equipment: "", level: "beginner", timed: false };
  return { id, name: e.name, muscles: e.primaryMuscles.map((m) => MUSCLE[m] ?? m).join(", "), equipment: EQUIP[equipmentKey(e)] ?? "", level: e.level, timed: isTimed(id) };
}

export type SearchFilters = { q?: string; muscle?: string; equipment?: string; level?: string; category?: string };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function searchExercises(f: SearchFilters, limit = 30, offset = 0) {
  const words = norm(f.q ?? "").split(/\s+/).filter(Boolean);
  const hits = EXERCISES.filter((e) =>
    (!f.category || e.category === f.category) &&
    (!f.muscle || e.primaryMuscles.includes(f.muscle) || e.secondaryMuscles.includes(f.muscle)) &&
    (!f.equipment || equipmentKey(e) === f.equipment) &&
    (!f.level || e.level === f.level) &&
    words.every((w) => norm(`${e.name} ${(extras as Record<string, { aliases?: string[] }>)[e.id]?.aliases?.join(" ") ?? ""} ${e.primaryMuscles.map((m) => `${m} ${MUSCLE[m] ?? ""}`).join(" ")} ${EQUIP[equipmentKey(e)] ?? ""}`).includes(w)),
  );
  return { total: hits.length, items: hits.slice(offset, offset + limit) };
}
