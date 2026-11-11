"use client";

import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiCompass, FiCrosshair, FiExternalLink, FiGlobe, FiHeart, FiMapPin, FiNavigation, FiPhone, FiSearch, FiX, FiClock, FiCopy, FiCheck } from "react-icons/fi";
import { appleMapsUrl, CAT, CATS, fmtDist, fmtRadius, googleDirectionsUrl, googlePlaceUrl, osmUrl, RADII, svgIcon, travel, type Gym, type GymCategory, type Loc } from "@/lib/gym-ui";
import type { Focus, Viewport } from "./GymMap";

const GymMap = dynamic(() => import("./GymMap"), { ssr: false, loading: () => <div className="skeleton h-full w-full" /> });

type Place = { name: string; lat: number; lon: number };
const LOC_KEY = "charge.gyms.loc", FAV_KEY = "charge.gyms.fav";
const store = {
  get<T>(k: string): T | null { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

async function api<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, cache: "no-store" });
  if (res.status === 401) { window.location.href = "/login"; return new Promise<never>(() => {}); }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as { error?: string }).error ?? "Something went wrong.");
  return j as T;
}

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement; const read = () => setDark(el.classList.contains("dark"));
    read(); const mo = new MutationObserver(read); mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return dark;
}

const WORLD_ZOOM = 12;

export default function GymFinder({ imperial }: { imperial: boolean }) {
  const dark = useIsDark();
  const [loc, setLoc] = useState<Loc | null>(null);
  const [booted, setBooted] = useState(false);
  const [mode, setMode] = useState<"near" | "world">("near");
  const [radius, setRadius] = useState<number>(10000);
  const [near, setNear] = useState<Gym[]>([]);
  const [worldGyms, setWorldGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [geoErr, setGeoErr] = useState("");
  const [locating, setLocating] = useState(false);
  const [cats, setCats] = useState<Set<GymCategory>>(new Set(CATS.map((c) => c.id)));
  const [onlySaved, setOnlySaved] = useState(false);
  const [fav, setFav] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [zoomHint, setZoomHint] = useState(false);
  const [q, setQ] = useState("");
  const [sent, setSent] = useState("");
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const focusKey = useRef(0);

  // remember where you were looking and which gyms you saved (kept on this device only)
  useEffect(() => {
    setFav(store.get<string[]>(FAV_KEY) ?? []);
    const saved = store.get<Loc>(LOC_KEY);
    if (saved && isFinite(saved.lat) && isFinite(saved.lon)) setLoc(saved);
    setBooted(true);
  }, []);
  const pickLoc = useCallback((l: Loc, fly = false) => {
    setLoc(l); store.set(LOC_KEY, l); setSelectedId(null); setGeoErr("");
    if (fly) setFocus({ lat: l.lat, lon: l.lon, zoom: 13, key: ++focusKey.current });
  }, []);

  const locate = useCallback(() => {
    setGeoErr("");
    if (!("geolocation" in navigator)) { setGeoErr("This browser can't share your location. Search for your city instead."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocating(false); pickLoc({ lat: p.coords.latitude, lon: p.coords.longitude, label: "Your location", kind: "gps" }, mode === "world"); },
      (e) => { setLocating(false); setGeoErr(e.code === 1 ? "Location is blocked for this site. Allow it in your browser's address bar, or search for your city." : "Couldn't find you just now. Try again, or search for your city."); },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  }, [mode, pickLoc]);

  // refresh a remembered GPS position quietly when the browser already allows it
  useEffect(() => {
    if (!booted || !loc || loc.kind !== "gps") return;
    navigator.permissions?.query({ name: "geolocation" }).then((s) => { if (s.state === "granted") navigator.geolocation.getCurrentPosition((p) => { if (Math.abs(p.coords.latitude - loc.lat) + Math.abs(p.coords.longitude - loc.lon) > 0.002) pickLoc({ lat: p.coords.latitude, lon: p.coords.longitude, label: "Your location", kind: "gps" }); }, () => {}, { maximumAge: 120000, timeout: 8000 }); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted]);

  // everything within the full 10 km, fetched once per position; the radius chips just filter it
  useEffect(() => {
    if (!loc || mode !== "near") return;
    const ac = new AbortController(); setLoading(true); setError("");
    api<{ gyms: Gym[] }>(`/api/gyms?lat=${loc.lat}&lon=${loc.lon}&r=10000`, ac.signal)
      .then((r) => { setNear(r.gyms); setLoading(false); })
      .catch((e: Error) => { if (e.name !== "AbortError") { setError(e.message); setLoading(false); } });
    return () => ac.abort();
  }, [loc, mode]);

  // explore mode: load what is in view once zoomed in far enough
  const worldAbort = useRef<AbortController | null>(null);
  const onViewport = useCallback((v: Viewport) => {
    if (mode !== "world") return;
    if (v.zoom < WORLD_ZOOM) { setZoomHint(true); setWorldGyms([]); setLoading(false); worldAbort.current?.abort(); return; }
    setZoomHint(false); worldAbort.current?.abort(); const ac = (worldAbort.current = new AbortController());
    setLoading(true); setError("");
    api<{ gyms: Gym[]; tooBig: boolean }>(`/api/gyms?s=${v.s}&w=${v.w}&n=${v.n}&e=${v.e}&lat=${v.lat}&lon=${v.lon}`, ac.signal)
      .then((r) => { if (r.tooBig) setZoomHint(true); else setWorldGyms(r.gyms); setLoading(false); })
      .catch((e: Error) => { if (e.name !== "AbortError") { setError(e.message); setLoading(false); } });
  }, [mode]);
  useEffect(() => { if (mode === "near") { worldAbort.current?.abort(); setZoomHint(false); } else { setSelectedId(null); setFocus(loc ? { lat: loc.lat, lon: loc.lon, zoom: 13, key: ++focusKey.current } : { lat: 25, lon: 10, zoom: 2, key: ++focusKey.current }); } }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // place search: only when the person presses Enter or the search button (the free OpenStreetMap service does not allow search-as-you-type)
  useEffect(() => {
    const term = sent.trim(); if (term.length < 2) { setPlaces(null); return; }
    const ac = new AbortController(); setSearching(true);
    api<{ places: Place[] }>(`/api/places?q=${encodeURIComponent(term)}`, ac.signal).then((r) => { setPlaces(r.places); setSearching(false); }).catch((e: Error) => { if (e.name !== "AbortError") { setPlaces([]); setSearching(false); } });
    return () => ac.abort();
  }, [sent]);

  const base = mode === "near" ? near.filter((g) => g.d <= radius) : worldGyms;
  const counts = useMemo(() => { const c: Record<string, number> = {}; base.forEach((g) => (c[g.cat] = (c[g.cat] ?? 0) + 1)); return c; }, [base]);
  const visible = useMemo(() => base.filter((g) => cats.has(g.cat) && (!onlySaved || fav.includes(g.id))), [base, cats, onlySaved, fav]);
  const selected = visible.find((g) => g.id === selectedId) ?? null;
  useEffect(() => { if (selectedId && !selected) setSelectedId(null); }, [selectedId, selected]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && setSelectedId(null); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  // with everything on, tapping a type shows just that type; tapping more adds them; emptying the set goes back to everything
  const toggleCat = (c: GymCategory) => setCats((cur) => {
    if (cur.size === CATS.length) return new Set([c]);
    const n = new Set(cur); if (n.has(c)) n.delete(c); else n.add(c);
    return n.size === 0 ? new Set(CATS.map((x) => x.id)) : n;
  });
  const toggleFav = (id: string) => setFav((cur) => { const n = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]; store.set(FAV_KEY, n); return n; });
  const choose = (g: Gym) => setSelectedId(g.id);
  const needsLoc = mode === "near" && booted && !loc;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-label="Map" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Map mode" className="relative inline-flex rounded-full border-2 border-border bg-card p-1 dark:border-darkmode-border dark:bg-darkmode-card">
            {([["near", "Around me", FiCrosshair], ["world", "Explore the world", FiGlobe]] as const).map(([id, label, Icon]) => (
              <button key={id} role="tab" aria-selected={mode === id} type="button" onClick={() => setMode(id)} className={`relative z-10 flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${mode === id ? "text-[color:var(--sk-ink)]" : "text-text-light dark:text-darkmode-text-light"}`}>
                {mode === id && <motion.span layoutId="gym-mode" className="absolute inset-0 -z-10 rounded-full bg-primary shadow-[0_3px_0_0_var(--sk-accent-strong)] dark:bg-darkmode-primary" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                <Icon aria-hidden />{label}
              </button>
            ))}
          </div>
          <AnimatePresence initial={false}>
            {mode === "near" && (
              <motion.div key="radii" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex items-center gap-2" role="group" aria-label="Search radius">
                {RADII.map((r) => <button key={r} type="button" className="gm-chip" aria-pressed={radius === r} onClick={() => setRadius(r)}>{fmtRadius(r, imperial)}</button>)}
              </motion.div>
            )}
          </AnimatePresence>
          <button type="button" onClick={locate} disabled={locating} className="gm-chip ml-auto"><FiNavigation aria-hidden className={locating ? "animate-pulse" : ""} />{locating ? "Locating…" : loc?.kind === "gps" ? "Locate me" : "Use my location"}</button>
        </div>

        <div className="map-frame h-[60dvh] min-h-[430px] lg:h-[calc(100dvh-16rem)] lg:min-h-[560px]">
          <GymMap center={loc} mode={mode} radius={radius} gyms={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId} onViewport={onViewport} focus={focus} dark={dark} />

          {/* search */}
          <div className="absolute left-3 right-3 top-3 z-[1100] max-w-md sm:right-auto sm:w-96">
            <form role="search" onSubmit={(e) => { e.preventDefault(); const t = q.trim(); if (t.length >= 2) setSent(t); }} className="flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-3.5 py-2.5 shadow-lg dark:border-darkmode-border dark:bg-darkmode-card">
              <button type="submit" aria-label="Search" className="shrink-0 text-text-light"><FiSearch aria-hidden /></button>
              <input aria-label="Search for a city or address" value={q} onChange={(e) => { setQ(e.target.value); setPlaces(null); setSent(""); }} placeholder="Search a city or address, then press Enter" className="min-w-0 grow !border-0 !bg-transparent !p-0 !shadow-none outline-none" autoComplete="off" enterKeyHint="search" />
              {q && <button type="button" aria-label="Clear search" onClick={() => { setQ(""); setSent(""); setPlaces(null); }} className="text-text-light"><FiX /></button>}
            </form>
            <AnimatePresence>
              {places && q.trim().length >= 2 && (
                <motion.ul initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 overflow-hidden rounded-2xl border-2 border-border bg-card shadow-xl dark:border-darkmode-border dark:bg-darkmode-card">
                  {places.length === 0 && <li className="px-4 py-3 text-sm text-text-light">{searching ? "Searching…" : "No place found. Try a bigger city name."}</li>}
                  {places.map((p) => (
                    <li key={`${p.lat},${p.lon}`}><button type="button" className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-light dark:hover:bg-darkmode-light" onClick={() => { pickLoc({ lat: p.lat, lon: p.lon, label: p.name, kind: "search" }, true); setQ(""); setPlaces(null); }}><FiMapPin aria-hidden className="shrink-0 text-primary dark:text-darkmode-primary" /><span className="truncate">{p.name}</span></button></li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          {/* status */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-[1100] flex max-w-[calc(100%-4.5rem)] flex-col items-start gap-2">
            <AnimatePresence>
              {loading && <motion.span key="l" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="gm-chip pointer-events-auto"><span className="live-dot" />Looking for places…</motion.span>}
              {!loading && mode === "world" && zoomHint && <motion.span key="z" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="gm-chip pointer-events-auto"><FiSearch aria-hidden />Zoom in or search a city to see gyms</motion.span>}
            </AnimatePresence>
          </div>

          {/* ask for a position */}
          <AnimatePresence>
            {needsLoc && (
              <motion.div key="ask" className="absolute inset-0 z-[1050] grid place-items-center bg-body/60 p-5 backdrop-blur-sm dark:bg-darkmode-body/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div initial={{ y: 24, scale: 0.96 }} animate={{ y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="gm-card max-w-sm p-6 text-center">
                  <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-2xl text-[color:var(--sk-ink)] shadow-[0_4px_0_0_var(--sk-accent-strong)] dark:bg-darkmode-primary"><FiCompass aria-hidden className="breathe" /></span>
                  <h2 className="h5 mb-1">Find places to train</h2>
                  <p className="mb-4 text-sm">Share your location to see every gym within 10 km, nearest first. Your position is only used to look up places nearby. It isn&apos;t saved.</p>
                  <button type="button" onClick={locate} disabled={locating} className="btn btn-primary w-full !rounded-full">{locating ? "Locating…" : "Use my location"}</button>
                  <p className="my-2 text-xs uppercase tracking-widest text-text-light">or</p>
                  <p className="text-sm">Search for a city with the box at the top.</p>
                  {geoErr && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{geoErr}</p>}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* the chosen place */}
          <AnimatePresence>
            {selected && <Detail key={selected.id} g={selected} imperial={imperial} saved={fav.includes(selected.id)} onSave={() => toggleFav(selected.id)} onClose={() => setSelectedId(null)} showRank={mode === "near" ? visible.indexOf(selected) + 1 : 0} />}
          </AnimatePresence>
        </div>
        {geoErr && !needsLoc && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{geoErr}</p>}
        <p className="mt-3 text-xs text-text-light dark:text-darkmode-text-light">Places come from OpenStreetMap contributors, so a few may be missing or out of date. Opening hours are as listed there.</p>
      </section>

      <aside aria-label="Places" className="min-w-0">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Filter by type">
          {CATS.map((c) => (
            <button key={c.id} type="button" aria-pressed={cats.has(c.id)} onClick={() => toggleCat(c.id)} className="gm-chip" data-cat={c.id}>
              <span aria-hidden className="inline-block h-3.5 w-3.5" dangerouslySetInnerHTML={{ __html: svgIcon(c.id) }} />{c.plural}<small>{counts[c.id] ?? 0}</small>
            </button>
          ))}
          <button type="button" aria-pressed={onlySaved} onClick={() => setOnlySaved((v) => !v)} className="gm-chip"><FiHeart aria-hidden />Saved<small>{fav.length}</small></button>
        </div>

        <div className="card p-2 lg:max-h-[calc(100dvh-19.6rem)] lg:overflow-y-auto">
          <div className="flex items-baseline justify-between px-3 pb-1 pt-2">
            <h2 className="font-secondary text-xl font-bold text-text-dark dark:text-darkmode-text-dark">{mode === "near" ? "Nearest first" : "Around the map"}</h2>
            <span className="text-sm tabular-nums text-text-light dark:text-darkmode-text-light">{visible.length} {visible.length === 1 ? "place" : "places"}</span>
          </div>
          {mode === "near" && loc && <p className="px-3 pb-2 text-xs text-text-light dark:text-darkmode-text-light">Within {fmtRadius(radius, imperial)} of {loc.label}</p>}

          {error && <div role="alert" className="m-2 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}{" "}<button type="button" className="font-bold underline" onClick={() => { const l = loc; setLoc(null); setTimeout(() => l && setLoc({ ...l }), 0); }}>Try again</button></div>}

          {loading && visible.length === 0 && <ul aria-label="Loading" className="space-y-2 p-2">{[0, 1, 2, 3, 4].map((i) => <li key={i} className="skeleton h-16 rounded-2xl" />)}</ul>}

          {!loading && !error && visible.length === 0 && (
            <div className="px-4 py-10 text-center text-sm">
              {mode === "world" ? <p>{zoomHint ? "Zoom in on a city to list its gyms here." : "No places in this part of the map."}</p>
                : !loc ? <p>Pick your location to see places nearby.</p>
                : onlySaved ? <p>You haven&apos;t saved any of these yet. Tap the heart on a place to keep it.</p>
                : <p>Nothing found within {fmtRadius(radius, imperial)}. {radius < 10000 ? "Try a wider radius, or " : "Try "}<button type="button" className="font-bold underline" onClick={() => setMode("world")}>exploring the world map</button>.</p>}
            </div>
          )}

          <ul className="space-y-1">
            {visible.slice(0, 80).map((g, i) => (
              <motion.li key={g.id} layout="position" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03, type: "spring", stiffness: 380, damping: 30 }}>
                <button type="button" className="gm-row" aria-current={selectedId === g.id} onClick={() => choose(g)}>
                  <span className="gm-dot" data-cat={g.cat}>{mode === "near" ? i + 1 : <span aria-hidden className="h-4 w-4" dangerouslySetInnerHTML={{ __html: svgIcon(g.cat) }} />}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-text-dark dark:text-darkmode-text-dark">{g.name}</span>
                    <span className="block truncate text-xs">{CAT[g.cat].label}{g.addr ? ` · ${g.addr}` : ""}</span>
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums text-primary dark:text-darkmode-primary">{fmtDist(g.d, imperial)}{fav.includes(g.id) && <FiHeart aria-label="Saved" className="ml-1 inline fill-current align-[-2px] text-xs" />}</span>
                </button>
              </motion.li>
            ))}
          </ul>
          {visible.length > 80 && <p className="px-3 py-3 text-center text-xs text-text-light">Showing the nearest 80. Narrow the types or the radius to see others.</p>}
        </div>
      </aside>
    </div>
  );
}

function Detail({ g, imperial, saved, onSave, onClose, showRank }: { g: Gym; imperial: boolean; saved: boolean; onSave: () => void; onClose: () => void; showRank: number }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText([g.name, g.addr].filter(Boolean).join(", ") || `${g.lat}, ${g.lon}`); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ } };
  const hours = g.hours?.split(/\s*;\s*/).filter(Boolean) ?? [];
  return (
    <motion.div role="dialog" aria-label={g.name} className="gm-card absolute bottom-3 left-3 right-3 z-[1200] max-h-[72%] overflow-y-auto p-4 sm:right-auto sm:w-[26rem] sm:p-5" initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.97 }} transition={{ type: "spring", stiffness: 360, damping: 28 }} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start gap-3">
        <span className="gm-dot shrink-0" data-cat={g.cat}>{showRank || <span aria-hidden className="h-4 w-4" dangerouslySetInnerHTML={{ __html: svgIcon(g.cat) }} />}</span>
        <div className="min-w-0 grow">
          <h3 className="font-secondary text-xl font-bold leading-tight text-text-dark dark:text-darkmode-text-dark">{g.name}</h3>
          <p className="text-sm">{CAT[g.cat].label}{g.brand && g.brand !== g.name ? ` · ${g.brand}` : ""}</p>
        </div>
        <button type="button" onClick={onSave} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save this place"} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-light text-lg dark:bg-darkmode-light"><motion.span key={String(saved)} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }}><FiHeart className={saved ? "fill-current text-red-500" : ""} /></motion.span></button>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-light text-lg dark:bg-darkmode-light"><FiX /></button>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"><b className="text-primary dark:text-darkmode-primary">{fmtDist(g.d, imperial)} away</b><span>about {travel(g.d)}</span></p>

      <dl className="mt-3 space-y-2 text-sm">
        {g.addr && <div className="flex gap-2"><dt className="sr-only">Address</dt><FiMapPin aria-hidden className="mt-0.5 shrink-0 text-text-light" /><dd className="grow">{g.addr}</dd><button type="button" onClick={copy} aria-label="Copy address" className="shrink-0 text-text-light hover:text-primary">{copied ? <FiCheck /> : <FiCopy />}</button></div>}
        {hours.length > 0 && <div className="flex gap-2"><dt className="sr-only">Opening hours</dt><FiClock aria-hidden className="mt-0.5 shrink-0 text-text-light" /><dd className="grow">{hours.slice(0, 4).map((h) => <span key={h} className="block">{h}</span>)}{hours.length > 4 && <span className="text-text-light">+{hours.length - 4} more</span>}</dd></div>}
        {g.phone && <div className="flex gap-2"><dt className="sr-only">Phone</dt><FiPhone aria-hidden className="mt-0.5 shrink-0 text-text-light" /><dd><a className="link-draw font-semibold" href={`tel:${g.phone.replace(/[^+\d]/g, "")}`}>{g.phone}</a></dd></div>}
        {g.web && <div className="flex gap-2"><dt className="sr-only">Website</dt><FiGlobe aria-hidden className="mt-0.5 shrink-0 text-text-light" /><dd className="min-w-0 truncate"><a className="link-draw font-semibold" href={g.web} target="_blank" rel="noopener noreferrer">{g.web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a></dd></div>}
        {(g.fee !== undefined || g.sports?.length) && <p className="flex flex-wrap gap-1.5 pt-1">{g.fee !== undefined && <span className="gm-chip !py-0.5 !text-xs">{g.fee ? "Paid" : "Free to use"}</span>}{g.sports?.map((s) => <span key={s} className="gm-chip !py-0.5 !text-xs capitalize">{s}</span>)}</p>}
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a className="btn btn-primary btn-sm !rounded-full" href={googleDirectionsUrl(g)} target="_blank" rel="noopener noreferrer"><FiNavigation aria-hidden />Directions</a>
        <a className="btn btn-outline-primary btn-sm !rounded-full" href={googlePlaceUrl(g)} target="_blank" rel="noopener noreferrer"><FiExternalLink aria-hidden />Google Maps</a>
      </div>
      <p className="mt-2 text-center text-xs text-text-light"><a className="link-draw" href={appleMapsUrl(g)} target="_blank" rel="noopener noreferrer">Apple Maps</a> · <a className="link-draw" href={osmUrl(g)} target="_blank" rel="noopener noreferrer">OpenStreetMap</a></p>
    </motion.div>
  );
}
