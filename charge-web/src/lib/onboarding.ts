export const STEPS = ["about", "body", "goal", "experience", "limits", "where", "lifestyle", "review"] as const;
export type Step = (typeof STEPS)[number];
export const STEP_TITLES: Record<Step, string> = {
  about: "About you", body: "Your body", goal: "Your goal", experience: "Experience", limits: "Pain and injuries", where: "Where you train",
  lifestyle: "Lifestyle", review: "All set",
};

export const GOALS = [
  { id: "muscle", title: "Build muscle", text: "Slight calorie surplus, higher volume." },
  { id: "lose", title: "Lose fat", text: "Moderate deficit, keep your muscle." },
  { id: "recomp", title: "Recomposition", text: "Lose fat and build muscle slowly." },
  { id: "strength", title: "Get stronger", text: "Heavier loads, fewer reps." },
  { id: "maintain", title: "Stay in shape", text: "Maintain what you have." },
  { id: "endurance", title: "Build endurance", text: "Lighter loads, more reps, shorter rests." },
] as const;
export const ACTIVITY = [
  { id: 1.2, title: "Mostly sitting", text: "Desk job, little walking." },
  { id: 1.375, title: "Lightly active", text: "Some walking during the day." },
  { id: 1.55, title: "Active", text: "On your feet most of the day." },
  { id: 1.725, title: "Very active", text: "Physical job or lots of daily movement." },
] as const;
export const DIETS = [
  { id: "omni", title: "I eat everything" },
  { id: "veg", title: "Vegetarian" },
  { id: "vegan", title: "Vegan" },
] as const;

export const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;
export const LOCATION_LABEL: Record<string, string> = { gym: "At the gym", home: "At home", both: "Gym and home" };
