// Client-safe helpers for the gym finder.
export type GymCategory = "gym" | "studio" | "outdoor" | "pool" | "shop";
export type Gym = {
  id: string; name: string; cat: GymCategory; lat: number; lon: number; d: number;
  brand?: string; addr?: string; hours?: string; phone?: string; web?: string; sports?: string[]; fee?: boolean; wheelchair?: string;
};

export const CATS: { id: GymCategory; label: string; plural: string; icon: string }[] = [
  { id: "gym", label: "Gym", plural: "Gyms", icon: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>' },
  { id: "studio", label: "Studio", plural: "Studios", icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
  { id: "outdoor", label: "Outdoor spot", plural: "Outdoor", icon: '<path d="M2 20l7-12 4 6 3-4 6 10z"/>' },
  { id: "pool", label: "Pool", plural: "Pools", icon: '<path d="M2 8c2.5-2 4.5 2 7 0s4.5 2 7 0 4.5 2 6 0M2 15c2.5-2 4.5 2 7 0s4.5 2 7 0 4.5 2 6 0"/>' },
  { id: "shop", label: "Supplement shop", plural: "Shops", icon: '<path d="M6 7h12l1 13H5zM9 7a3 3 0 016 0"/>' },
];
export const CAT = Object.fromEntries(CATS.map((c) => [c.id, c])) as Record<GymCategory, (typeof CATS)[number]>;
export const svgIcon = (c: GymCategory) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CAT[c].icon}</svg>`;

export const RADII = [2000, 5000, 10000] as const;
export const KM_PER_MI = 1.609344;

export function fmtDist(m: number, imperial: boolean) {
  if (imperial) { const mi = m / 1609.344; return mi < 0.1 ? `${Math.round(m * 3.281 / 10) * 10} ft` : `${mi.toFixed(mi < 10 ? 1 : 0)} mi`; }
  return m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}
export const fmtRadius = (m: number, imperial: boolean) => (imperial ? `${(m / 1609.344).toFixed(1)} mi` : `${m / 1000} km`);

/** Straight-line distance, so the time is a friendly estimate rather than a route. */
export function travel(m: number) {
  const walk = m / 83; // 5 km/h
  if (walk <= 45) return `${Math.max(1, Math.round(walk))} min on foot`;
  return `${Math.max(1, Math.round(m / 250))} min by bike`; // 15 km/h
}

const enc = encodeURIComponent;
/** The place's own Google Maps page (when Google knows it), found by name and address. */
export const googlePlaceUrl = (g: Gym) => `https://www.google.com/maps/search/?api=1&query=${enc([g.name, g.addr ?? `${g.lat},${g.lon}`].join(" "))}`;
export const googleDirectionsUrl = (g: Gym) => `https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lon}&travelmode=walking`;
export const appleMapsUrl = (g: Gym) => `https://maps.apple.com/?daddr=${g.lat},${g.lon}&q=${enc(g.name)}`;
export const osmUrl = (g: Gym) => `https://www.openstreetmap.org/${g.id}`;

export const TILES = {
  // The standard OpenStreetMap map pictures: free and need no key. At night the same pictures are darkened with a CSS filter.
  light: process.env.NEXT_PUBLIC_MAP_TILES_LIGHT ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  dark: process.env.NEXT_PUBLIC_MAP_TILES_DARK ?? process.env.NEXT_PUBLIC_MAP_TILES_LIGHT ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  /** providers with a real dark style set NEXT_PUBLIC_MAP_TILES_DARK; otherwise we darken the light one */
  get filterDark() { return this.dark === this.light; },
  /** retina tiles only if the provider's URL has {r} */
  get retina() { return /\{r\}/.test(this.light); },
};

export type Loc = { lat: number; lon: number; label: string; kind: "gps" | "search" };
