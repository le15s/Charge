// Client-safe. Splits the muscles of an exercise into three tiers.
//   main   = the muscles the exercise is built for (library "primary")
//   medium = the helpers that do real work (library "secondary")
//   slight = stabilisers and grip. The library does not list these, so they are estimated
//            from the main muscle, the equipment and whether the move is a compound lift.

const HELPERS: Record<string, string[]> = {
  chest: ["abdominals", "forearms"],
  shoulders: ["traps", "abdominals", "forearms"],
  triceps: ["forearms", "shoulders"],
  biceps: ["forearms", "shoulders"],
  lats: ["forearms", "abdominals", "lower back"],
  "middle back": ["forearms", "lower back", "abdominals"],
  traps: ["forearms", "neck"],
  quadriceps: ["abdominals", "lower back", "calves"],
  hamstrings: ["lower back", "glutes", "calves"],
  glutes: ["lower back", "abdominals", "hamstrings"],
  calves: ["abdominals"],
  abdominals: ["lower back", "shoulders"],
  "lower back": ["glutes", "hamstrings", "abdominals"],
  forearms: [],
  neck: ["traps"],
  abductors: ["abdominals", "glutes"],
  adductors: ["abdominals", "glutes"],
};

const GRIP_EQUIPMENT = new Set(["barbell", "dumbbell", "kettlebells", "e-z curl bar", "cable"]);

export type MuscleTiers = { main: string[]; medium: string[]; slight: string[] };

export function muscleTiers(e: { primaryMuscles: string[]; secondaryMuscles: string[]; mechanic: string | null; equipment: string | null }): MuscleTiers {
  const main = [...e.primaryMuscles];
  const medium = e.secondaryMuscles.filter((m) => !main.includes(m));
  const taken = new Set([...main, ...medium]);
  const pool: string[] = [];
  for (const m of main) for (const h of HELPERS[m] ?? []) if (!pool.includes(h)) pool.push(h);
  // holding a bar or dumbbell works the grip, however isolated the move is
  if (e.equipment && GRIP_EQUIPMENT.has(e.equipment) && !pool.includes("forearms")) pool.push("forearms");
  const free = pool.filter((m) => !taken.has(m));
  // an isolation move recruits fewer stabilisers than a compound lift
  const slight = e.mechanic === "isolation" ? free.filter((m) => m === "forearms").slice(0, 1) : free.slice(0, 3);
  return { main, medium, slight };
}
