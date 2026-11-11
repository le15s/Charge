"use client";

import { addPhoto, deleteMeasures, deletePhoto, deleteWeight, saveMeasures, saveWeight, type BodyData } from "@/app/actions/body";
import { dayMs, fmtDay, lenDisplay, MEASURE_LABEL, MEASURES, todayStr, unitOf, type MeasureKey } from "@/lib/body";
import { toDisplay } from "@/lib/units";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { MuscleMap, Strength } from "./BodyTraining";
import ProgressChart from "./ProgressChart";
import type { TrainingStats } from "@/app/actions/training-stats";

type Tab = "overview" | "muscles" | "strength" | "log" | "photos";
type Photo = BodyData["photos"][number];
const POSES = ["front", "side", "back", "other"] as const;
const parseNum = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isNaN(n) ? null : n; };
const sign = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(Math.round(n * 10) / 10)}`;
const pill = (on: boolean) => `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${on ? "bg-[color:var(--sk-accent)] text-[color:var(--sk-ink)]" : "bg-[color:var(--sk-light)] hover:brightness-95"}`;

export default function BodyHub({ data, stats }: { data: BodyData; stats: TrainingStats }) {
  const [tab, setTab] = useState<Tab>("overview");
  const { units } = data;
  return (
    <div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Body sections">
        {([["overview", "Overview"], ["muscles", "Muscles"], ["strength", "Strength"], ["log", "Log"], ["photos", `Photos${data.photos.length ? ` (${data.photos.length})` : ""}`]] as const).map(([id, l]) => (
          <button key={id} role="tab" id={`btab-${id}`} aria-selected={tab === id} aria-controls={`bpanel-${id}`} className={`${pill(tab === id)} shrink-0 whitespace-nowrap`} onClick={() => setTab(id)}>{l}</button>
        ))}
      </div>
      <div role="tabpanel" id={`bpanel-${tab}`} aria-labelledby={`btab-${tab}`}>
        {tab === "overview" && <Overview data={data} onLog={() => setTab("log")} />}
        {tab === "muscles" && <MuscleMap stats={stats} />}
        {tab === "strength" && <Strength stats={stats} body={data} />}
        {tab === "log" && <Log data={data} units={units} />}
        {tab === "photos" && <Photos data={data} />}
      </div>
    </div>
  );
}

/* ---------------- Overview ---------------- */
function Overview({ data, onLog }: { data: BodyData; onLog: () => void }) {
  const { units, weights, measures, goalKg } = data;
  const [metric, setMetric] = useState<MeasureKey>("waist");
  const wPts = weights.map((w) => ({ at: dayMs(w.day), value: toDisplay(w.kg, units) ?? 0 }));
  const first = weights[0], last = weights.at(-1);
  const change = first && last && first !== last ? (toDisplay(last.kg, units)! - toDisplay(first.kg, units)!) : null;
  const toGoal = last && goalKg ? toDisplay(goalKg - last.kg, units)! : null;
  const have = MEASURES.filter((k) => measures.some((m) => m[k] != null));
  const mk = have.includes(metric) ? metric : have[0];
  const mPts = mk ? measures.filter((m) => m[mk] != null).map((m) => ({ at: dayMs(m.day), value: mk === "bodyFat" ? (m[mk] as number) : lenDisplay(m[mk] as number, units)! })) : [];

  if (!weights.length && !measures.length) {
    return (
      <div className="card p-8 text-center">
        <p className="font-secondary text-xl font-bold">Nothing logged yet</p>
        <p className="mx-auto mt-1 max-w-md text-text-light dark:text-darkmode-text-light">Weigh in once a week, take a tape measure to your waist and arms, and the charts fill themselves in.</p>
        <button className="btn btn-primary mt-4" onClick={onLog}>Log my first entry</button>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Now" value={last ? `${toDisplay(last.kg, units)} ${units}` : "—"} sub={last ? fmtDay(last.day) : ""} />
        <Stat label="Since the start" value={change == null ? "—" : `${sign(change)} ${units}`} sub={first ? `from ${toDisplay(first.kg, units)} ${units}` : ""} />
        <Stat label="To your goal" value={toGoal == null ? "Set one in Settings" : Math.abs(toGoal) < 0.1 ? "Reached" : `${sign(toGoal)} ${units}`} sub={goalKg ? `goal ${toDisplay(goalKg, units)} ${units}` : ""} />
      </div>
      {wPts.length >= 2 && (
        <section className="card p-4 sm:p-5" aria-label="Weight over time">
          <h2 className="h6 mb-2">Weight</h2>
          <ProgressChart points={wPts} unit={units} label="Weight" />
        </section>
      )}
      {mk && (
        <section className="card p-4 sm:p-5" aria-label="Measurements">
          <h2 className="h6 mb-3">Measurements</h2>
          <div className="mb-3 flex flex-wrap gap-2">{have.map((k) => <button key={k} aria-pressed={k === mk} className={pill(k === mk)} onClick={() => setMetric(k)}>{MEASURE_LABEL[k]}</button>)}</div>
          {mPts.length >= 2 ? <ProgressChart points={mPts} unit={unitOf(mk, units)} label={MEASURE_LABEL[mk]} /> : <p className="text-sm text-text-light dark:text-darkmode-text-light">One {MEASURE_LABEL[mk].toLowerCase()} reading so far. Add another next week and a line appears.</p>}
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {have.map((k) => {
              const rows = measures.filter((m) => m[k] != null); const a = rows[0][k] as number, b = rows.at(-1)![k] as number;
              const f = (v: number) => (k === "bodyFat" ? v : lenDisplay(v, units)!);
              return <li key={k} className="rounded-xl bg-[color:var(--sk-light)] px-3 py-2 text-sm"><span className="block text-xs font-bold uppercase tracking-wide text-text-light dark:text-darkmode-text-light">{MEASURE_LABEL[k]}</span><b>{f(b)} {unitOf(k, units)}</b>{rows.length > 1 && <span className="ml-1 text-text-light dark:text-darkmode-text-light">({sign(f(b) - f(a))})</span>}</li>;
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="card p-4"><p className="text-xs font-bold uppercase tracking-wide text-text-light dark:text-darkmode-text-light">{label}</p><p className="font-secondary text-2xl font-extrabold tabular-nums">{value}</p>{sub && <p className="text-xs text-text-light dark:text-darkmode-text-light">{sub}</p>}</div>;
}

/* ---------------- Log ---------------- */
function Log({ data, units }: { data: BodyData; units: "kg" | "lb" }) {
  const router = useRouter();
  const [day, setDay] = useState(todayStr());
  const existingW = data.weights.find((w) => w.day === day);
  const existingM = data.measures.find((m) => m.day === day);
  const [w, setW] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  // when the date changes, show what is already saved for that date
  const [seen, setSeen] = useState("");
  const key = day + (existingW?.id ?? "") + (existingM?.id ?? "");
  if (seen !== key) {
    setSeen(key);
    setW(existingW ? String(toDisplay(existingW.kg, units)) : "");
    setVals(Object.fromEntries(MEASURES.map((k) => [k, existingM?.[k] != null ? String(k === "bodyFat" ? existingM[k] : lenDisplay(existingM[k] as number, units)) : ""])));
  }
  const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); window.setTimeout(() => setMsg(null), 3000); };

  const saveW = () => start(async () => {
    const n = parseNum(w); if (n == null) return flash(false, "Enter your weight first.");
    const r = await saveWeight(day, n, units); if (!r.ok) return flash(false, r.error);
    flash(true, `Weight saved for ${fmtDay(day)}`); router.refresh();
  });
  const saveM = () => start(async () => {
    const values = Object.fromEntries(MEASURES.map((k) => [k, vals[k] ? parseNum(vals[k]) : null]));
    const r = await saveMeasures(day, values, units); if (!r.ok) return flash(false, r.error);
    flash(true, `Measurements saved for ${fmtDay(day)}`); router.refresh();
  });
  const recent = useMemo(() => [
    ...data.weights.map((x) => ({ kind: "w" as const, id: x.id, day: x.day, text: `${toDisplay(x.kg, units)} ${units}` })),
    ...data.measures.map((x) => ({ kind: "m" as const, id: x.id, day: x.day, text: MEASURES.filter((k) => x[k] != null).map((k) => `${MEASURE_LABEL[k]} ${k === "bodyFat" ? x[k] : lenDisplay(x[k] as number, units)}${unitOf(k, units)}`).join(" · ") })),
  ].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 14), [data, units]);

  return (
    <div className="space-y-5">
      <div className="card p-4 sm:p-5">
        <label htmlFor="b-day" className="form-label">Date</label>
        <input id="b-day" type="date" max={todayStr()} className="form-input !w-auto" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
      </div>
      <section className="card p-4 sm:p-5" aria-label="Weight">
        <h2 className="h6 mb-2">Weight</h2>
        <div className="flex gap-2">
          <input aria-label={`Weight in ${units}`} inputMode="decimal" className="form-input grow text-lg tabular-nums" value={w} onChange={(e) => setW(e.target.value)} placeholder={`e.g. ${units === "kg" ? "78.4" : "172.8"}`} />
          <span className="flex items-center font-semibold">{units}</span>
          <button className="btn btn-primary" disabled={pending} onClick={saveW}>{existingW ? "Update" : "Save"}</button>
        </div>
      </section>
      <section className="card p-4 sm:p-5" aria-label="Measurements form">
        <h2 className="h6 mb-1">Tape measure</h2>
        <p className="mb-3 text-sm text-text-light dark:text-darkmode-text-light">Fill in what you measured. Leave the rest empty. Measure at the same spot each time, relaxed, in the morning.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MEASURES.map((k) => (
            <div key={k}>
              <label htmlFor={`m-${k}`} className="form-label">{MEASURE_LABEL[k]} ({unitOf(k, units)})</label>
              <input id={`m-${k}`} inputMode="decimal" className="form-input tabular-nums" value={vals[k] ?? ""} onChange={(e) => setVals((c) => ({ ...c, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
        <button className="btn btn-primary mt-4" disabled={pending} onClick={saveM}>{existingM ? "Update measurements" : "Save measurements"}</button>
      </section>
      <p role="status" aria-live="polite" className={`min-h-6 text-sm font-semibold ${msg ? (msg.ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400") : ""}`}>{msg?.text}</p>
      {recent.length > 0 && (
        <section className="card divide-y divide-[color:var(--sk-line)]" aria-label="Recent entries">
          <h2 className="h6 px-4 pt-4 sm:px-5">Recent entries</h2>
          {recent.map((r) => (
            <div key={r.kind + r.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
              <span className="w-28 shrink-0 text-sm text-text-light dark:text-darkmode-text-light">{fmtDay(r.day)}</span>
              <span className="min-w-0 grow truncate text-sm font-semibold">{r.kind === "w" ? "⚖ " : "📏 "}{r.text}</span>
              <button className="px-2 text-sm text-red-600 dark:text-red-400" aria-label={`Delete ${r.kind === "w" ? "weight" : "measurements"} from ${fmtDay(r.day)}`} onClick={() => start(async () => { await (r.kind === "w" ? deleteWeight(r.id) : deleteMeasures(r.id)); router.refresh(); })}>Delete</button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

/* ---------------- Photos ---------------- */
/** Shrink a photo in the browser so it stays small: a 1200 px version and a 360 px thumbnail, both JPEG. */
async function shrink(file: File) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const draw = (max: number, q: number) => {
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", q);
  };
  let full = draw(1200, 0.82);
  for (const q of [0.7, 0.6, 0.5]) if (full.length > 850_000) full = draw(1000, q);
  const thumb = draw(360, 0.72);
  bmp.close();
  return { full, thumb };
}

function Photos({ data }: { data: BodyData }) {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [pose, setPose] = useState<(typeof POSES)[number]>("front");
  const [day, setDay] = useState(todayStr());
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<"all" | (typeof POSES)[number]>("all");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<Photo | null>(null);
  const [pick, setPick] = useState<string[]>([]);
  const [compare, setCompare] = useState(false);
  const [pending, start] = useTransition();

  async function onFile(f: File | undefined) {
    if (!f) return;
    setErr(""); setBusy(true);
    try {
      if (!f.type.startsWith("image/")) throw new Error("Choose an image file.");
      const { full, thumb } = await shrink(f);
      const r = await addPhoto({ day, pose, note, full, thumb });
      if (!r.ok) throw new Error(r.error);
      setNote(""); router.refresh();
    } catch (e) { setErr((e as Error).message || "Couldn't add that photo."); }
    setBusy(false); if (file.current) file.current.value = "";
  }
  const list = data.photos.filter((p) => filter === "all" || p.pose === filter);
  const toggle = (id: string) => setPick((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c.slice(-1), id]));
  const byId = (id: string) => data.photos.find((p) => p.id === id)!;
  const weightOn = (d: string) => { const w = [...data.weights].filter((x) => x.day <= d).at(-1) ?? data.weights.find((x) => x.day >= d); return w ? `${toDisplay(w.kg, data.units)} ${data.units}` : null; };

  return (
    <div className="space-y-5">
      <section className="card p-4 sm:p-5" aria-label="Add a photo">
        <h2 className="h6 mb-1">Add a photo</h2>
        <p className="mb-3 text-sm text-text-light dark:text-darkmode-text-light">Private to you. Photos are shrunk on your device and only you can open them. Same spot, same light, same pose works best.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div><label htmlFor="p-day" className="form-label">Date</label><input id="p-day" type="date" max={todayStr()} className="form-input" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} /></div>
          <div><span className="form-label block">Pose</span><div className="flex gap-1.5" role="group" aria-label="Pose">{POSES.map((p) => <button key={p} type="button" aria-pressed={pose === p} className={`${pill(pose === p)} capitalize`} onClick={() => setPose(p)}>{p}</button>)}</div></div>
          <div className="min-w-40 grow"><label htmlFor="p-note" className="form-label">Note (optional)</label><input id="p-note" className="form-input" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. week 8, morning" /></div>
          <button className="btn btn-primary" disabled={busy} onClick={() => file.current?.click()}>{busy ? "Saving…" : "Choose photo"}</button>
          <input ref={file} type="file" accept="image/*" className="sr-only" aria-label="Photo file" data-testid="photo-file" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
        {err && <p role="alert" className="mt-3 text-sm font-semibold text-red-600 dark:text-red-400">{err}</p>}
      </section>

      {data.photos.length === 0 ? (
        <p className="card p-8 text-center text-text-light dark:text-darkmode-text-light">No photos yet. The first one is the hardest, and the one you will be happiest to have in three months.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {(["all", ...POSES] as const).map((p) => <button key={p} aria-pressed={filter === p} className={`${pill(filter === p)} capitalize`} onClick={() => setFilter(p)}>{p}</button>)}
            <span className="grow" />
            <button className="btn btn-outline-primary btn-sm" disabled={pick.length !== 2} onClick={() => setCompare(true)}>{pick.length === 2 ? "Compare the two" : `Pick 2 to compare (${pick.length}/2)`}</button>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Photos">
            {list.map((p) => (
              <li key={p.id} className="relative overflow-hidden rounded-2xl border-2 border-[color:var(--sk-line)] bg-[color:var(--sk-light)]">
                <button type="button" onClick={() => setOpen(p)} className="block w-full" aria-label={`Open ${p.pose} photo from ${fmtDay(p.day)}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/body-photo/${p.id}`} alt={`${p.pose} photo, ${fmtDay(p.day)}`} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                </button>
                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs"><span className="font-semibold">{fmtDay(p.day)}</span><span className="rounded-full bg-[color:var(--sk-card)] px-2 py-0.5 font-bold capitalize">{p.pose}</span></div>
                <label className="absolute left-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[color:var(--sk-card)]/90 shadow ring-1 ring-[color:var(--sk-line)]">
                  <input type="checkbox" className="h-4 w-4 accent-[color:var(--sk-accent)]" checked={pick.includes(p.id)} onChange={() => toggle(p.id)} aria-label={`Select photo from ${fmtDay(p.day)} to compare`} />
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      <AnimatePresence>
        {open && (
          <Overlay onClose={() => setOpen(null)} label="Photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/body-photo/${open.id}?size=full`} alt={`${open.pose} photo, ${fmtDay(open.day)}`} className="max-h-[70dvh] w-full rounded-xl object-contain" />
            <p className="mt-3 font-semibold">{fmtDay(open.day)} · <span className="capitalize">{open.pose}</span>{weightOn(open.day) ? ` · ${weightOn(open.day)}` : ""}</p>
            {open.note && <p className="text-sm text-text-light dark:text-darkmode-text-light">{open.note}</p>}
            <div className="mt-3 flex justify-between gap-3">
              <button className="btn btn-outline-primary btn-sm" onClick={() => setOpen(null)}>Close</button>
              <button className="btn btn-sm border-red-600 bg-red-600 text-white" disabled={pending} onClick={() => { const id = open.id; start(async () => { await deletePhoto(id); setOpen(null); setPick((c) => c.filter((x) => x !== id)); router.refresh(); }); }}>Delete photo</button>
            </div>
          </Overlay>
        )}
        {compare && pick.length === 2 && (() => {
          const [a, b] = [byId(pick[0]), byId(pick[1])].sort((x, y) => x.day.localeCompare(y.day));
          return (
            <Overlay key="cmp" onClose={() => setCompare(false)} label="Compare photos">
              <Slider before={a} after={b} />
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                {[a, b].map((p, i) => <div key={p.id}><p className="text-xs font-bold uppercase tracking-wide text-text-light dark:text-darkmode-text-light">{i ? "After" : "Before"}</p><p className="font-semibold">{fmtDay(p.day)}</p><p className="text-text-light dark:text-darkmode-text-light">{weightOn(p.day) ?? ""}</p></div>)}
              </div>
              <p className="mt-2 text-sm text-text-light dark:text-darkmode-text-light">{Math.round((dayMs(b.day) - dayMs(a.day)) / 86400000)} days apart{weightOn(a.day) && weightOn(b.day) ? ` · ${sign(parseFloat(weightOn(b.day)!) - parseFloat(weightOn(a.day)!))} ${data.units}` : ""}</p>
              <button className="btn btn-outline-primary btn-sm mt-3" onClick={() => setCompare(false)}>Close</button>
            </Overlay>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

/** Drag the handle to wipe between the earlier and the later photo. */
function Slider({ before, after }: { before: Photo; after: Photo }) {
  const [x, setX] = useState(50);
  return (
    <div>
      <div className="relative mx-auto aspect-[3/4] max-h-[62dvh] select-none overflow-hidden rounded-xl bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/body-photo/${after.id}?size=full`} alt={`After, ${fmtDay(after.day)}`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/body-photo/${before.id}?size=full`} alt={`Before, ${fmtDay(before.day)}`} className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }} draggable={false} />
        <span aria-hidden className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${x}%` }} />
        <span aria-hidden className="absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs font-bold text-black shadow" style={{ left: `${x}%` }}>⇆</span>
      </div>
      <input type="range" min={0} max={100} value={x} onChange={(e) => setX(+e.target.value)} aria-label="Slide between before and after" className="mt-3 w-full accent-[color:var(--sk-accent)]" />
    </div>
  );
}

function Overlay({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
      <motion.div role="dialog" aria-modal="true" aria-label={label} className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-[color:var(--sk-card)] p-4 shadow-2xl" initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>
        {children}
      </motion.div>
    </motion.div>
  );
}
