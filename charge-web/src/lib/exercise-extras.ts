// Extra details for some exercises (tips, other names, which exercise it is a variation of, a demo video, a one-line description).
// Source: exercemus/exercises (code is MIT, https://github.com/exercemus/exercises). Its data has a per-exercise licence field; the only entry that has one (CC-BY-SA 3, "Dumbbell Skullcrusher") is not included. The other entries have no licence field.
import raw from "@/data/exercise-extras.json";
import { EXERCISES } from "./exercises";

export type Extras = { tips?: string[]; aliases?: string[]; variationOf?: string[]; video?: string; desc?: string };
const EXTRAS = raw as Record<string, Extras>;
const BY_NAME = new Map(EXERCISES.map((e) => [e.name.toLowerCase(), e.id]));

export const aliasesOf = (id: string) => EXTRAS[id]?.aliases ?? [];
export function extrasFor(id: string) {
  const x = EXTRAS[id]; if (!x) return null;
  return { tips: x.tips ?? [], aliases: x.aliases ?? [], video: x.video ?? null, desc: x.desc ?? null,
    variationOf: (x.variationOf ?? []).filter((n) => BY_NAME.get(n.toLowerCase()) !== id).map((n) => ({ name: n.replace(/\b\w/g, (c) => c.toUpperCase()), id: BY_NAME.get(n.toLowerCase()) ?? null })) };
}
