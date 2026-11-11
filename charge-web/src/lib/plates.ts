// Client-safe. Every workout gets its own plate colour (one of 16), used on the Home barbell, in rotations and on workout cards.
export const PLATE_NAMES = ["Red", "Blue", "Yellow", "Green", "Orange", "Purple", "Teal", "Pink", "Lime", "Brown", "Sky", "Mint", "Slate", "Coral", "Lavender", "Burgundy"];
export const PLATE_COUNT = PLATE_NAMES.length;
/** For workouts that are not one of your saved routines (a quick, empty workout). */
export const PLATE_NEUTRAL = -1;

/** The CSS colour of a plate (the values live in main.css and switch with light/dark). */
export const plateVar = (n: number) => (n >= 0 && n < PLATE_COUNT ? `var(--pc-${n})` : "var(--pc-steel)");

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); };

type R = { id: string; plateColor: number | null; createdAt: Date | number };
/** Colour of each routine: the one saved on it, or else the first colour nobody else is using (in order of creation). */
export function plateColors(routines: R[]): Map<string, number> {
  const out = new Map<string, number>(); const used = new Set<number>();
  for (const r of routines) if (r.plateColor != null && r.plateColor >= 0 && r.plateColor < PLATE_COUNT) { out.set(r.id, r.plateColor); used.add(r.plateColor); }
  const t = (r: R) => (r.createdAt instanceof Date ? r.createdAt.getTime() : r.createdAt);
  for (const r of routines.filter((x) => !out.has(x.id)).sort((a, b) => t(a) - t(b))) {
    let c = -1; for (let i = 0; i < PLATE_COUNT; i++) if (!used.has(i)) { c = i; break; }
    if (c < 0) c = hash(r.id) % PLATE_COUNT;
    out.set(r.id, c); used.add(c);
  }
  return out;
}
/** The first colour not yet used by these colours (for a new workout). */
export const freeColor = (taken: number[]) => { for (let i = 0; i < PLATE_COUNT; i++) if (!taken.includes(i)) return i; return Math.floor(Math.random() * PLATE_COUNT); };
/** Colour for a finished workout: its routine's colour (even if the routine was deleted), or neutral for an empty workout. */
export const colorOfWorkout = (routineId: string | null, map: Map<string, number>) => (routineId ? map.get(routineId) ?? hash(routineId) % PLATE_COUNT : PLATE_NEUTRAL);
/** Text colour that stays readable on top of a plate colour (light plates get dark text; at night every plate is light). */
const LIGHT_PLATES = new Set([2, 8, 10, 11, 13, 14]);
export const plateInkClass = (n: number) => (LIGHT_PLATES.has(n) ? "text-text-dark" : "text-white dark:text-text-dark");
