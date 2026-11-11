// Client-safe helpers for the Body page.
import type { Units } from "./units";

export const MEASURES = ["waist", "chest", "hips", "neck", "shoulders", "arm", "thigh", "calf", "bodyFat"] as const;
export type MeasureKey = (typeof MEASURES)[number];
export const MEASURE_LABEL: Record<MeasureKey, string> = { waist: "Waist", chest: "Chest", hips: "Hips", neck: "Neck", shoulders: "Shoulders", arm: "Upper arm", thigh: "Thigh", calf: "Calf", bodyFat: "Body fat" };

/** Lengths follow the weight unit: kg users see cm, lb users see inches. Storage is always cm. */
export const lenUnit = (u: Units) => (u === "lb" ? "in" : "cm");
export const lenDisplay = (cm: number | null | undefined, u: Units) => (cm == null ? null : Math.round((u === "lb" ? cm / 2.54 : cm) * 10) / 10);
export const unitOf = (k: MeasureKey, u: Units) => (k === "bodyFat" ? "%" : lenUnit(u));
export const todayStr = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const dayMs = (day: string) => new Date(day + "T12:00:00").getTime();
export const fmtDay = (day: string) => new Date(day + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
