// Client-safe labels (does not pull in the 800 KB exercise dataset).
export const MUSCLE_LABEL: Record<string, string> = {
  abdominals: "Abs", abductors: "Abductors", adductors: "Adductors", biceps: "Biceps", calves: "Calves", chest: "Chest",
  forearms: "Forearms", glutes: "Glutes", hamstrings: "Hamstrings", lats: "Lats", "lower back": "Lower back",
  "middle back": "Middle back", neck: "Neck", quadriceps: "Quads", shoulders: "Shoulders", traps: "Traps", triceps: "Triceps",
};
export const EQUIPMENT_LABEL: Record<string, string> = {
  barbell: "Barbell", dumbbell: "Dumbbell", cable: "Cable", machine: "Machine", "body only": "Bodyweight", kettlebells: "Kettlebell",
  bands: "Bands", "e-z curl bar": "EZ bar", other: "Other", "medicine ball": "Medicine ball", "exercise ball": "Exercise ball",
  "foam roll": "Foam roller", none: "No equipment",
};
export const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate", expert: "Expert" } as const;
export const CATEGORY_LABEL: Record<string, string> = {
  strength: "Strength", stretching: "Stretching", plyometrics: "Plyometrics", powerlifting: "Powerlifting",
  "olympic weightlifting": "Olympic lifting", strongman: "Strongman", cardio: "Cardio",
};


const IMG_BASE = process.env.NEXT_PUBLIC_EXERCISE_IMG_BASE ?? "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";
export const exerciseImage = (id: string, i = 0) => `${IMG_BASE}/${id}/${i}.jpg`;

