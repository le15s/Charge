// Client-safe chat constants and helpers (no database imports).

export const MAX_MEMBERS = 10; // people in a group, including the person who made it
export const MAX_MSG = 1000;
export const MAX_GROUP_NAME = 40;

/** A colour for a name, always the same one, so each person keeps their avatar colour. */
export function avatarHue(name: string) {
  let h = 0;
  for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
export const initialsOf = (name: string) => (name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2) || "?").toUpperCase();

/** "12:41", "Yesterday", "Mon" or "Oct 3": the short time a chat list shows. */
export function shortTime(t: number, now = Date.now()) {
  const d = new Date(t), n = new Date(now);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(n) - day(d)) / 864e5);
  if (diff <= 0) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
/** The label above a run of messages from one day. */
export function dayLabel(t: number, now = Date.now()) {
  const d = new Date(t), n = new Date(now);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(n) - day(d)) / 864e5);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: d.getFullYear() === n.getFullYear() ? undefined : "numeric" });
}
export const clock = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
