import "server-only";

/**
 * Gym finder data. Everything comes from OpenStreetMap (through the Overpass API), which is free and needs no key.
 * Results are cached in memory for ten minutes so a busy city is only asked about once.
 */

export type GymCategory = "gym" | "studio" | "outdoor" | "pool" | "shop";
export type Gym = {
  id: string; name: string; cat: GymCategory; lat: number; lon: number;
  /** metres from the point the search was centred on */
  d: number;
  brand?: string; addr?: string; hours?: string; phone?: string; web?: string; sports?: string[]; fee?: boolean; wheelchair?: string;
};

export const MAX_RADIUS = 10_000;
const MAX_BBOX_DEG = 0.3; // explore mode: about 30 km on a side

const MIRRORS = (process.env.OVERPASS_URL ? process.env.OVERPASS_URL.split(",").map((u) => u.trim()).filter(Boolean) : [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
]);
// The public OpenStreetMap servers ask every app to identify itself with a contact. Set CONTACT_URL (your site or an email) when you deploy.
const UA = `ChargeFitnessApp/1.0 (gym finder; ${process.env.CONTACT_URL ?? "self-hosted"})`;

const STUDIO_SPORTS = /yoga|pilates|climbing|bouldering|crossfit|boxing|kickboxing|martial|karate|judo|taekwondo|bjj|brazilian|muay|wrestling|dance|gymnastics|calisthenics|parkour|barre|spinning|cycling/;

/** The OSM tags that mean "a place you can train". Split in two so the cheap, important part never waits for the slow part. */
function coreSelectors(area: string) {
  return [
    `nwr["leisure"="fitness_centre"]${area};`,
    `nwr["amenity"="gym"]${area};`,
    `nwr["leisure"="sports_centre"]["sport"~"fitness|gym|climbing|bouldering|crossfit|yoga|pilates|boxing|martial|swimming|multi"]${area};`,
    `nwr["leisure"="sports_hall"]["sport"~"fitness|gym|climbing|crossfit|boxing|martial"]${area};`,
    `nwr["leisure"="fitness_station"]${area};`,
  ].join("\n  ");
}
function extraSelectors(area: string) {
  return [
    `nwr["leisure"="swimming_pool"]["access"!~"private|no|customers"]["name"]${area};`,
    `nwr["sport"~"yoga|pilates|climbing|bouldering|crossfit|boxing|martial_arts|karate|judo|taekwondo|brazilian_jiu_jitsu|muay_thai|dance|gymnastics"]["name"]["leisure"!~"pitch|track|stadium"]${area};`,
    `nwr["shop"="nutrition_supplements"]${area};`,
  ].join("\n  ");
}

// A box is much cheaper for Overpass than "around" (it can use its spatial index first), and distances are worked out here afterwards.
const buildQuery = (sel: string, limit: number) => `[out:json][timeout:15];\n(\n  ${sel}\n);\nout center tags ${limit};`;

type El = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

function categorise(t: Record<string, string>): GymCategory {
  const sport = (t.sport ?? "").toLowerCase();
  if (t.shop === "nutrition_supplements") return "shop";
  if (t.leisure === "fitness_station") return "outdoor";
  if (t.leisure === "swimming_pool" || (t.leisure === "sports_centre" && /swimming/.test(sport) && !/fitness|gym/.test(sport))) return "pool";
  if (t.leisure === "fitness_centre" || t.amenity === "gym") return STUDIO_SPORTS.test(sport) && !/fitness|gym|weight/.test(sport) ? "studio" : "gym";
  if (STUDIO_SPORTS.test(sport)) return "studio";
  return "gym";
}

const DEFAULT_NAME: Record<GymCategory, string> = { gym: "Gym", studio: "Studio", outdoor: "Outdoor fitness spot", pool: "Swimming pool", shop: "Supplement shop" };

function addressOf(t: Record<string, string>) {
  const street = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ");
  const city = [t["addr:postcode"], t["addr:city"] ?? t["addr:suburb"]].filter(Boolean).join(" ");
  return [street, city].filter(Boolean).join(", ") || t["addr:full"] || undefined;
}

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

const clean = (s: string | undefined, max = 200) => (s ? s.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) || undefined : undefined);
function safeUrl(u: string | undefined) {
  if (!u) return undefined;
  const v = /^https?:\/\//i.test(u) ? u : `https://${u}`;
  try { const x = new URL(v); return x.protocol === "http:" || x.protocol === "https:" ? x.toString() : undefined; } catch { return undefined; }
}

function parse(els: El[]): Omit<Gym, "d">[] {
  const seen = new Set<string>();
  const out: Omit<Gym, "d">[] = [];
  for (const e of els) {
    const t = e.tags ?? {};
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
    if (lat == null || lon == null) continue;
    const id = `${e.type}/${e.id}`;
    if (seen.has(id)) continue; seen.add(id);
    const cat = categorise(t);
    // unnamed pools and shops are noise; unnamed outdoor stations are still useful
    const name = clean(t.name) ?? clean(t.brand) ?? clean(t.operator);
    if (!name && (cat === "pool" || cat === "shop")) continue;
    out.push({
      id, cat, lat, lon, name: name ?? DEFAULT_NAME[cat],
      brand: clean(t.brand, 80), addr: clean(addressOf(t)), hours: clean(t.opening_hours, 300),
      phone: clean(t.phone ?? t["contact:phone"], 40), web: safeUrl(t.website ?? t["contact:website"] ?? t.url),
      sports: t.sport ? t.sport.split(/[;,]/).map((s) => s.trim().replace(/_/g, " ")).filter(Boolean).slice(0, 6) : undefined,
      fee: t.fee ? t.fee === "yes" : undefined, wheelchair: t.wheelchair,
    });
  }
  return out;
}

type Hit = { at: number; gyms: Omit<Gym, "d">[] };
const cache = new Map<string, Hit>();
const inflight = new Map<string, Promise<Omit<Gym, "d">[]>>();
const TTL = 10 * 60_000;

async function overpass(query: string): Promise<Omit<Gym, "d">[]> {
  let last: unknown;
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": UA, accept: "application/json" }, body: `data=${encodeURIComponent(query)}`, signal: AbortSignal.timeout(18_000), cache: "no-store" });
      if (!res.ok) { last = new Error(`overpass ${res.status}`); continue; }
      const json = (await res.json()) as { elements?: El[]; remark?: string };
      // Overpass answers 200 with an empty list and a "remark" when a query runs out of time or memory. That is a failure, not "no gyms here".
      if (json.remark && /runtime error|timed out|out of memory|too many|rate_limited/i.test(json.remark) && !(json.elements?.length)) { last = new Error(`overpass: ${json.remark}`); continue; }
      return parse(json.elements ?? []);
    } catch (e) { last = e; }
  }
  throw last ?? new Error("overpass unreachable");
}

async function cached(key: string, query: string) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.gyms;
  let p = inflight.get(key);
  if (!p) {
    p = overpass(query).then((g) => { cache.set(key, { at: Date.now(), gyms: g }); if (cache.size > 300) cache.delete(cache.keys().next().value as string); return g; }).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

const finish = (gyms: Omit<Gym, "d">[], lat: number, lon: number, maxD = Infinity, limit = 400): Gym[] =>
  gyms.map((g) => ({ ...g, d: Math.round(haversine(lat, lon, g.lat, g.lon)) })).filter((g) => g.d <= maxD).sort((a, b) => a.d - b.d).slice(0, limit);

/** Core places must load; the extras (pools, studios, shops) are a bonus and never block or fail the answer. */
async function both(key: string, sel: (area: string) => [string, string], area: string, limits: [number, number]) {
  const [coreSel, extraSel] = sel(area);
  const core = cached(`${key}:c`, buildQuery(coreSel, limits[0]));
  const extra = cached(`${key}:x`, buildQuery(extraSel, limits[1])).catch(() => [] as Omit<Gym, "d">[]);
  const [c, x] = await Promise.all([core, extra]);
  const seen = new Set(c.map((g) => g.id));
  return [...c, ...x.filter((g) => !seen.has(g.id))];
}
const selectors = (area: string): [string, string] => [coreSelectors(area), extraSelectors(area)];

/** Everything to train at within `radius` metres of a point, nearest first. */
export async function gymsAround(lat: number, lon: number, radius: number): Promise<Gym[]> {
  const r = Math.min(MAX_RADIUS, Math.max(500, Math.round(radius)));
  // ask around a rounded centre with some slack so nearby searches share one answer
  const cLat = Math.round(lat * 100) / 100, cLon = Math.round(lon * 100) / 100;
  const slack = Math.ceil(haversine(lat, lon, cLat, cLon)) + 200;
  const ask = Math.min(MAX_RADIUS + 1500, MAX_RADIUS + slack);
  const dLat = ask / 111_320, dLon = ask / (111_320 * Math.max(0.05, Math.cos((cLat * Math.PI) / 180)));
  const f = (v: number) => v.toFixed(4);
  const area = `(${f(cLat - dLat)},${f(cLon - dLon)},${f(cLat + dLat)},${f(cLon + dLon)})`;
  const all = await both(`r:${cLat}:${cLon}:${ask}`, selectors, area, [700, 400]);
  return finish(all, lat, lon, r, 400);
}

export type Bbox = { s: number; w: number; n: number; e: number };
/** Explore mode: whatever is inside the visible part of the map (kept small so the answer stays fast). */
export async function gymsInBox(b: Bbox, refLat: number, refLon: number): Promise<{ gyms: Gym[]; tooBig: boolean }> {
  if (b.n - b.s > MAX_BBOX_DEG || b.e - b.w > MAX_BBOX_DEG * 1.6) return { gyms: [], tooBig: true };
  const q = (v: number, dir: "down" | "up") => (dir === "down" ? Math.floor(v * 200) / 200 : Math.ceil(v * 200) / 200); // 0.005° grid
  const s = q(b.s, "down"), w = q(b.w, "down"), n = q(b.n, "up"), e = q(b.e, "up");
  const all = await both(`b:${s}:${w}:${n}:${e}`, selectors, `(${s},${w},${n},${e})`, [600, 300]);
  return { gyms: finish(all, refLat, refLon, Infinity, 400), tooBig: false };
}

// ---- place search (OpenStreetMap Nominatim) ----
export type Place = { name: string; lat: number; lon: number };
const NOMINATIM = process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org";
const placeCache = new Map<string, { at: number; v: Place[] }>();
let nextSlot = 0;

export async function searchPlaces(q: string): Promise<Place[]> {
  const key = q.trim().toLowerCase().slice(0, 100);
  if (key.length < 2) return [];
  const hit = placeCache.get(key);
  if (hit && Date.now() - hit.at < 3_600_000) return hit.v;
  // the public service allows one request per second
  const wait = Math.max(0, nextSlot - Date.now()); nextSlot = Date.now() + wait + 1100;
  if (wait) await new Promise((r) => setTimeout(r, wait));
  const res = await fetch(`${NOMINATIM}/search?format=jsonv2&limit=5&addressdetails=0&q=${encodeURIComponent(key)}`, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  const v = rows.map((r) => ({ name: r.display_name.split(",").slice(0, 3).join(",").trim(), lat: +r.lat, lon: +r.lon })).filter((p) => isFinite(p.lat) && isFinite(p.lon));
  placeCache.set(key, { at: Date.now(), v }); if (placeCache.size > 500) placeCache.delete(placeCache.keys().next().value as string);
  return v;
}

// ---- tiny per-user rate limit ----
const hits = new Map<string, number[]>();
export function limited(userId: string, max = 40, windowMs = 60_000) {
  const now = Date.now();
  const list = (hits.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) { hits.set(userId, list); return true; }
  list.push(now); hits.set(userId, list);
  if (hits.size > 2000) hits.delete(hits.keys().next().value as string);
  return false;
}
