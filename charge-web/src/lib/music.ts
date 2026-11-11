// Client-safe. Checks a playlist link and says which music service it belongs to.
// Charge does not play or copy any music: a saved link just opens in the person's own music app, which does the playing
// (background, lock screen and offline downloads all work there).

export type MusicKind = "spotify" | "youtubemusic" | "youtube" | "apple" | "deezer" | "soundcloud" | "tidal" | "amazon" | "anghami" | "audiomack" | "other";

export const MUSIC_KINDS: Record<MusicKind, { label: string; hosts: RegExp }> = {
  spotify: { label: "Spotify", hosts: /^(open\.spotify\.com|spotify\.link|play\.spotify\.com)$/ },
  youtubemusic: { label: "YouTube Music", hosts: /^music\.youtube\.com$/ },
  youtube: { label: "YouTube", hosts: /^((www|m)\.)?youtube\.com$|^youtu\.be$/ },
  apple: { label: "Apple Music", hosts: /^(music|embed\.music)\.apple\.com$|^itunes\.apple\.com$/ },
  deezer: { label: "Deezer", hosts: /^((www)\.)?deezer\.com$|^link\.deezer\.com$|^dzr\.page\.link$/ },
  soundcloud: { label: "SoundCloud", hosts: /^((www|m)\.)?soundcloud\.com$|^on\.soundcloud\.com$/ },
  tidal: { label: "Tidal", hosts: /^(listen\.)?tidal\.com$/ },
  amazon: { label: "Amazon Music", hosts: /^music\.amazon\.[a-z.]+$/ },
  anghami: { label: "Anghami", hosts: /^((play|www)\.)?anghami\.com$/ },
  audiomack: { label: "Audiomack", hosts: /^(www\.)?audiomack\.com$/ },
  other: { label: "Link", hosts: /^$/ },
};

export type MusicItem = { id: string; title: string; url: string; kind: MusicKind };
export const MAX_MUSIC_LINKS = 20;

export type ParsedMusic = { ok: true; url: string; kind: MusicKind } | { ok: false; error: string };

/** Only https links to real websites are accepted (no scripts, no app schemes, no addresses like 192.168.x.x or localhost). */
export function parseMusicUrl(raw: string): ParsedMusic {
  const text = raw.trim();
  if (!text) return { ok: false, error: "Paste a link to your playlist." };
  if (text.length > 500) return { ok: false, error: "That link is too long." };
  let u: URL;
  try { u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`); } catch { return { ok: false, error: "That doesn't look like a link." }; }
  if (u.protocol !== "https:") return { ok: false, error: "The link must start with https://" };
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || /\.(local|internal|localhost)$/.test(host)) return { ok: false, error: "Use the link from your music app's Share menu." };
  if (u.username || u.password) return { ok: false, error: "The link must not contain a login." };
  const kind = (Object.keys(MUSIC_KINDS) as MusicKind[]).find((k) => k !== "other" && MUSIC_KINDS[k].hosts.test(host)) ?? "other";
  return { ok: true, url: u.toString(), kind };
}

export const defaultTitle = (kind: MusicKind) => (kind === "other" ? "My playlist" : `${MUSIC_KINDS[kind].label} playlist`);
