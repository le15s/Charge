export type Units = "kg" | "lb";
export const KG_TO_LB = 2.20462;
const r = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

/** kg (storage) to the user's unit (display). */
export const toDisplay = (kg: number | null | undefined, u: Units): number | null => (kg == null ? null : u === "lb" ? r(kg * KG_TO_LB, 1) : r(kg, 2));
/** The user's unit (input) to kg (storage). */
export const fromDisplay = (v: number | null | undefined, u: Units): number | null => (v == null || Number.isNaN(v) ? null : u === "lb" ? r(v / KG_TO_LB, 2) : v);
export const fmtWeight = (kg: number | null | undefined, u: Units) => (kg == null ? "—" : `${r(u === "lb" ? kg * KG_TO_LB : kg, 1)} ${u}`);
export const cmToFtIn = (cm: number) => {
  const totalIn = Math.round(cm / 2.54);
  return { ft: Math.floor(totalIn / 12), inch: totalIn % 12 };
};
export const ftInToCm = (ft: number, inch: number) => Math.round((ft * 12 + inch) * 2.54 * 10) / 10;
export const e1rm = (w: number, reps: number) => (w > 0 && reps > 0 ? w * (1 + Math.min(reps, 12) / 30) : 0);
