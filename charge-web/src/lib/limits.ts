// Client-safe. Body areas a person can mark as sore or injured, and which exercises load each area.
// Guidelines only, never medical advice: the lists come from exercise names and common coaching practice, and a person with an injury
// should follow what their doctor or physio says.

export const AREAS = [
  { id: "neck", label: "Neck" },
  { id: "shoulder", label: "Shoulders" },
  { id: "elbow_wrist", label: "Elbows or wrists" },
  { id: "lower_back", label: "Lower back" },
  { id: "hip", label: "Hips" },
  { id: "knee", label: "Knees" },
  { id: "ankle", label: "Ankles or feet" },
] as const;
export type AreaId = (typeof AREAS)[number]["id"];
/** careful = it bothers you a little or you are coming back from an injury; avoid = it hurts or a professional told you to stay away from it. */
export type Severity = "careful" | "avoid";
export type Limits = Partial<Record<AreaId, Severity>>;
export const AREA_LABEL = Object.fromEntries(AREAS.map((a) => [a.id, a.label])) as Record<AreaId, string>;
export const AREA_WORD: Record<AreaId, string> = { neck: "neck", shoulder: "shoulders", elbow_wrist: "elbows and wrists", lower_back: "lower back", hip: "hips", knee: "knees", ankle: "ankles and feet" };

/** 2 = hard on the area (even "careful" skips it), 1 = it works the area (only "avoid" skips it). */
type Rule = [RegExp, AreaId, 1 | 2];
const RULES: Rule[] = [
  // knees
  [/jump|plyo(?!.*push)|burpee|pistol|sissy|leg extension|depth|bounding|skater|hack squat|box squat/i, "knee", 2],
  [/squat|lunge|leg press|step[- ]?ups?|wall sit|split squat|stair/i, "knee", 1],
  // lower back
  [/deadlift|good morning|\bclean\b|snatch|swing|bent over|barbell row|t-bar|hyperextension|back extension|rack pull|stiff[- ]leg|romanian|pendlay|atlas/i, "lower_back", 2],
  [/barbell (full )?squat|front squat|overhead squat|standing (military|barbell|shoulder) press|sit[- ]?ups?|leg raise|russian twist|windmill|superman|\brows?\b/i, "lower_back", 1],
  // shoulders
  [/overhead|military|push press|arnold|behind (the )?neck|upright row|snatch|handstand|jerk|dip/i, "shoulder", 2],
  [/bench press|incline|decline|fly|flye|crossover|lateral raise|front raise|pullover|pull-?up|chin-?up|push-?up|shoulder press|^(?!.*(leg|calf|hack|sled|pressdown|press down)).*press/i, "shoulder", 1],
  // elbows and wrists
  [/skull|lying triceps|triceps extension|french|wrist curl|reverse wrist|dip/i, "elbow_wrist", 2],
  [/^(?!.*(leg|hamstring|nordic)).*curl|push-?up|pull-?up|chin-?up|front squat|close-grip|triceps|^(?!.*(leg|calf|hack|sled)).*press|\brows?\b|\bclean\b/i, "elbow_wrist", 1],
  // hips
  [/sumo|deep squat|good morning|hip (flexor|abduction|adduction)|windshield/i, "hip", 2],
  [/squat|lunge|leg raise|step-?up|leg press|split squat|glute|deadlift|abduct|adduct|hip thrust/i, "hip", 1],
  // ankles and feet
  [/jump|plyo(?!.*push)|burpee|box jump|skater|jump rope|rope jump|skipping|\bsprints?\b|\brun(ning)?\b|bounding|\bhops?\b|hurdle/i, "ankle", 2],
  [/calf|lunge|step-?up|squat|stair|walk/i, "ankle", 1],
  // neck
  [/behind (the )?neck|neck (bridge|curl|extension|harness|flexion)|isometric neck|handstand|headstand/i, "neck", 2],
  [/shrug|upright row|barbell (full )?squat|military|overhead/i, "neck", 1],
];

const cache = new Map<string, Partial<Record<AreaId, 1 | 2>>>();
/** How much an exercise loads each body area (by its name). Missing area = not noticeably. */
export function stressOf(name: string): Partial<Record<AreaId, 1 | 2>> {
  const hit = cache.get(name);
  if (hit) return hit;
  const out: Partial<Record<AreaId, 1 | 2>> = {};
  if (/stretch|foam roll|mobility/i.test(name)) { cache.set(name, out); return out; }
  for (const [re, area, lvl] of RULES) if (re.test(name) && (out[area] ?? 0) < lvl) out[area] = lvl;
  cache.set(name, out);
  return out;
}

/** The areas where this exercise clashes with the person's limits, worst first. */
export function clashes(name: string, limits: Limits | null | undefined): { area: AreaId; severity: Severity; stress: 1 | 2 }[] {
  if (!limits) return [];
  const s = stressOf(name);
  const out: { area: AreaId; severity: Severity; stress: 1 | 2 }[] = [];
  for (const a of AREAS) {
    const sev = limits[a.id]; const st = s[a.id];
    if (!sev || !st) continue;
    if (sev === "avoid" || st === 2) out.push({ area: a.id, severity: sev, stress: st });
  }
  return out.sort((x, y) => (y.severity === "avoid" ? 1 : 0) - (x.severity === "avoid" ? 1 : 0) || y.stress - x.stress);
}
export const hasLimits = (l: Limits | null | undefined) => !!l && Object.keys(l).length > 0;
export const cleanLimits = (raw: unknown): Limits => {
  const out: Limits = {};
  if (raw && typeof raw === "object") for (const a of AREAS) { const v = (raw as Record<string, unknown>)[a.id]; if (v === "careful" || v === "avoid") out[a.id] = v; }
  return out;
};
