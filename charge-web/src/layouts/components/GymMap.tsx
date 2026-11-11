"use client";

import "leaflet/dist/leaflet.css";
import type * as LT from "leaflet";
import { useEffect, useRef, useState } from "react";
import { CAT, svgIcon, TILES, type Gym } from "@/lib/gym-ui";

export type Viewport = { s: number; w: number; n: number; e: number; zoom: number; lat: number; lon: number };
export type Focus = { lat: number; lon: number; zoom?: number; key: number };

type Props = {
  center: { lat: number; lon: number } | null;
  mode: "near" | "world";
  radius: number;
  gyms: Gym[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onViewport?: (v: Viewport) => void;
  focus?: Focus | null;
  dark: boolean;
};

/** Points of a circle, for the "spotlight" that dims everything beyond the search radius. */
function ring(lat: number, lon: number, r: number, n = 90): [number, number][] {
  const out: [number, number][] = [];
  const dLat = r / 111320, dLon = r / (111320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI; out.push([lat + dLat * Math.sin(a), lon + dLon * Math.cos(a)]); }
  return out;
}

export default function GymMap({ center, mode, radius, gyms, selectedId, onSelect, onViewport, focus, dark }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const L = useRef<typeof LT | null>(null);
  const map = useRef<LT.Map | null>(null);
  const tiles = useRef<LT.TileLayer | null>(null);
  const pins = useRef<LT.LayerGroup | null>(null);
  const area = useRef<LT.LayerGroup | null>(null);
  const markers = useRef(new Map<string, LT.Marker>());
  const cb = useRef({ onSelect, onViewport });
  useEffect(() => { cb.current = { onSelect, onViewport }; });

  // create the map once
  useEffect(() => {
    let dead = false; let m: LT.Map | null = null; let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      const mod = await import("leaflet"); if (dead || !host.current) return;
      const lf = (mod as unknown as { default?: typeof LT }).default ?? mod; L.current = lf;
      m = lf.map(host.current, { zoomControl: false, zoomSnap: 0.5, worldCopyJump: true, minZoom: 2, maxZoom: 19, attributionControl: true, maxBoundsViscosity: 1 });
      lf.control.zoom({ position: "bottomright" }).addTo(m);
      m.attributionControl.setPrefix(false);
      m.setView([25, 10], 2);
      tiles.current = lf.tileLayer(dark ? TILES.dark : TILES.light, { subdomains: "abc", maxZoom: 19, detectRetina: TILES.retina, attribution: TILES.attribution }).addTo(m);
      area.current = lf.layerGroup().addTo(m); pins.current = lf.layerGroup().addTo(m);
      m.on("click", () => cb.current.onSelect(null));
      m.on("moveend", () => { clearTimeout(timer); timer = setTimeout(() => { if (!m) return; const b = m.getBounds(), c = m.getCenter(); cb.current.onViewport?.({ s: b.getSouth(), w: b.getWest(), n: b.getNorth(), e: b.getEast(), zoom: m.getZoom(), lat: c.lat, lon: c.lng }); }, 450); });
      // zoomed out, pins turn into small dots so a busy city stays readable (see .gm-pin in sections.css)
      const setZ = () => { if (m && host.current) host.current.setAttribute("data-z", m.getZoom() >= 14 ? "pin" : "dot"); };
      m.on("zoomend", setZ); setZ();
      map.current = m; setReady(true);
      const fit = () => m?.invalidateSize(); window.addEventListener("resize", fit);
      (m as unknown as { _fit: () => void })._fit = fit;
    })();
    return () => { dead = true; clearTimeout(timer); const f = (m as unknown as { _fit?: () => void } | null)?._fit; if (f) window.removeEventListener("resize", f); m?.remove(); map.current = null; setReady(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // light / dark map
  useEffect(() => {
    tiles.current?.setUrl(dark ? TILES.dark : TILES.light);
    host.current?.setAttribute("data-night", dark && TILES.filterDark ? "1" : "0");
  }, [dark, ready]);

  // the user's dot, the 10 km circle and the dimmed outside
  useEffect(() => {
    const lf = L.current, m = map.current, g = area.current; if (!ready || !lf || !m || !g) return;
    g.clearLayers();
    if (!center) { m.setMaxBounds(undefined as unknown as LT.LatLngBounds); m.setMinZoom(2); return; }
    const you = lf.marker([center.lat, center.lon], { icon: lf.divIcon({ className: "gm-pin-wrap", html: '<div class="gm-you"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false, keyboard: false, zIndexOffset: 2000 });
    g.addLayer(you);
    if (mode === "near") {
      const css = getComputedStyle(host.current!); const accent = css.getPropertyValue("--sk-accent").trim() || "#0a84c6";
      const pts = ring(center.lat, center.lon, radius);
      g.addLayer(lf.polygon([[[85, -180], [85, 180], [-85, 180], [-85, -180]], pts], { stroke: false, fillColor: "#06141c", fillOpacity: dark ? 0.55 : 0.32, interactive: false }));
      g.addLayer(lf.circle([center.lat, center.lon], { radius, color: accent, weight: 3, dashArray: "2 9", lineCap: "round", fill: false, interactive: false }));
      const bounds = lf.latLngBounds(pts);
      const padded = bounds.pad(0.12);
      m.setMaxBounds(undefined as unknown as LT.LatLngBounds);
      m.fitBounds(bounds, { padding: [24, 24], animate: true, duration: 0.9 });
      m.once("moveend", () => { if (!map.current) return; m.setMinZoom(Math.max(2, m.getBoundsZoom(padded) - 0.5)); m.setMaxBounds(padded.pad(0.15)); });
    } else {
      m.setMaxBounds(undefined as unknown as LT.LatLngBounds); m.setMinZoom(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, center?.lat, center?.lon, mode, radius, dark]);

  // jump somewhere on request (a searched place, "world" mode)
  useEffect(() => {
    const m = map.current; if (!ready || !m || !focus) return;
    m.setMaxBounds(undefined as unknown as LT.LatLngBounds); m.setMinZoom(2);
    m.flyTo([focus.lat, focus.lon], focus.zoom ?? 13, { duration: 1.2 });
  }, [ready, focus]);

  // pins
  useEffect(() => {
    const lf = L.current, g = pins.current; if (!ready || !lf || !g) return;
    g.clearLayers(); markers.current.clear();
    gyms.forEach((gym, i) => {
      const top = mode === "near" && i < 5, small = !top && i >= 25;
      const html = `<div class="gm-pin ${top ? "top" : ""} ${small ? "small" : ""}" data-cat="${gym.cat}" style="--i:${Math.min(i, 30)}">${top ? `<span>${i + 1}</span>` : svgIcon(gym.cat)}</div>`;
      const sz = small ? 24 : 34;
      const mk = lf.marker([gym.lat, gym.lon], { icon: lf.divIcon({ className: "gm-pin-wrap", html, iconSize: [sz, sz], iconAnchor: [sz / 2, sz + 2] }), title: `${gym.name} (${CAT[gym.cat].label})`, riseOnHover: true, zIndexOffset: top ? 1000 - i : 0 });
      mk.on("click", (ev) => { lf.DomEvent.stopPropagation(ev as unknown as Event); cb.current.onSelect(gym.id); });
      g.addLayer(mk); markers.current.set(gym.id, mk);
    });
  }, [ready, gyms, mode]);

  // the selected pin lifts and the map glides to it
  useEffect(() => {
    markers.current.forEach((mk, id) => mk.getElement()?.querySelector(".gm-pin")?.classList.toggle("sel", id === selectedId));
    const m = map.current, mk = selectedId ? markers.current.get(selectedId) : null; if (!m || !mk) return;
    mk.setZIndexOffset(3000);
    // zoom in far enough to see pins, and keep the chosen one above the details card on a phone
    const z = Math.max(m.getZoom(), 14.5), ll = mk.getLatLng();
    const shift = window.innerWidth < 640 ? m.getSize().y * 0.2 : 0;
    const aim = shift ? m.unproject(m.project(ll, z).add([0, shift]), z) : ll;
    m.flyTo(aim, z, { duration: 0.8 });
    return () => { mk.setZIndexOffset(0); };
  }, [selectedId, gyms, ready]);

  return <div ref={host} className="h-full w-full" role="application" aria-label="Map of gyms nearby" />;
}
