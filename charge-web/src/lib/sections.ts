// Client-safe. Every area of the app has its own look ("skin"): colour, heading font, background and motion.
export type SectionId = "home" | "workouts" | "exercises" | "food" | "stock" | "community" | "history" | "gyms" | "body" | "settings" | "more" | "session";

export function sectionOf(path: string): SectionId {
  if (path.startsWith("/workout/")) return "session";
  if (path.startsWith("/workouts") || path.startsWith("/programs")) return "workouts";
  if (path.startsWith("/exercises")) return "exercises";
  if (path.startsWith("/food")) return "food";
  if (path.startsWith("/stock")) return "stock";
  if (path.startsWith("/community")) return "community";
  if (path.startsWith("/history")) return "history";
  if (path.startsWith("/gyms")) return "gyms";
  if (path.startsWith("/body")) return "body";
  if (path.startsWith("/settings")) return "settings";
  if (path.startsWith("/more")) return "more";
  return "home";
}

/** The idea behind each skin, in one line. */
export const SECTION_IDEA: Record<SectionId, string> = {
  home: "iron and chalk",
  workouts: "the coach's whiteboard",
  exercises: "an anatomy atlas",
  food: "a market stall menu",
  stock: "the supply warehouse",
  community: "the locker room",
  history: "a leather logbook",
  gyms: "the street map",
  body: "the tailor's tape",
  settings: "the control panel",
  more: "the control panel",
  session: "the live set",
};
