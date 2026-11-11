"use client";

import { finishWaveCycle, importShared, installProgram, saveWave, setWaveWeek, startWaveSession, type Wave } from "@/app/actions/programs";
import { decodeShare, encodeShare, LIFTS, PROGRAMS, trainingMax, WAVE, waveWeights, type LiftKey, type Program, type ShareWorkout } from "@/lib/programs";
import { EXERCISE_BY_ID } from "@/lib/exercises";
import { fromDisplay, toDisplay, type Units } from "@/lib/units";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type R = { id: string; name: string; exercises: ShareWorkout["exercises"] };
const parseNum = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isNaN(n) ? null : n; };
const fmt = (kg: number, u: Units) => `${toDisplay(kg, u)} ${u}`;

export default function ProgramsHub({ units, wave, routines, initialCode }: { units: Units; wave: Wave | null; routines: R[]; initialCode: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const say = (ok: boolean, text: string) => { setMsg({ ok, text }); window.setTimeout(() => setMsg(null), 5000); };

  const install = (p: Program) => start(async () => {
    const r = await installProgram(p.id);
    if (!r.ok) return say(false, r.error ?? "Couldn't add it.");
    say(true, `${r.count} workouts added. They are your new rotation.`); router.refresh();
  });

  return (
    <div className="space-y-10">
      <p role="status" aria-live="polite" className={`min-h-6 text-sm font-semibold ${msg ? (msg.ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400") : ""}`} data-testid="prog-msg">{msg?.text}{msg?.ok && <> <Link href="/workouts" className="underline">See my workouts</Link></>}</p>

      <section aria-label="Programs" className="grid gap-5 lg:grid-cols-2">
        {PROGRAMS.map((p) => (
          <article key={p.id} className="card flex flex-col gap-3 p-5" data-testid={`prog-${p.id}`}>
            <div>
              <h2 className="font-secondary text-2xl font-bold">{p.name}</h2>
              <p className="text-sm text-text-light dark:text-darkmode-text-light"><span className="capitalize">{p.level}</span> · {p.perWeek} days a week · {p.days.length} workouts</p>
            </div>
            <p>{p.blurb}</p>
            <details className="rounded-xl bg-[color:var(--sk-light)] px-4 py-3">
              <summary className="cursor-pointer font-semibold">How it works</summary>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">{p.how.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </details>
            <ul className="space-y-1 text-sm">{p.days.map((d) => <li key={d.name}><b>{d.name}:</b> {d.ex.map((e) => `${EXERCISE_BY_ID[e.id]?.name ?? e.id} ${e.sets}×${e.min === e.max ? e.min : `${e.min}-${e.max}`}`).join(", ")}</li>)}</ul>
            {p.wave && <Wave5 units={units} wave={wave} />}
            <div className="mt-auto pt-2"><button className="btn btn-primary btn-sm" disabled={pending} onClick={() => install(p)}>Add to my workouts</button></div>
          </article>
        ))}
      </section>

      <Share routines={routines} initialCode={initialCode} onDone={(ok, t) => { say(ok, t); if (ok) router.refresh(); }} />
    </div>
  );
}

/* ---------------- 5/3/1 wave ---------------- */
function Wave5({ units, wave }: { units: Units; wave: Wave | null }) {
  const router = useRouter();
  const [tms, setTms] = useState<Record<LiftKey, string>>({ squat: "", bench: "", deadlift: "", press: "", ...Object.fromEntries(LIFTS.map((l) => [l.key, wave?.[l.key] != null ? String(toDisplay(wave[l.key], units)) : ""])) } as Record<LiftKey, string>);
  const [est, setEst] = useState<Record<LiftKey, { w: string; r: string }>>({ squat: { w: "", r: "" }, bench: { w: "", r: "" }, deadlift: { w: "", r: "" }, press: { w: "", r: "" } });
  const [open, setOpen] = useState(!!wave);
  const [err, setErr] = useState(""); const [pending, start] = useTransition();
  const week = wave?.week ?? 1;
  const save = () => start(async () => {
    const v = Object.fromEntries(LIFTS.map((l) => { const n = parseNum(tms[l.key]); return [l.key, n == null ? null : fromDisplay(n, units)]; }));
    const r = await saveWave(v); if (!r.ok) return setErr(r.error ?? "Check the numbers."); setErr(""); router.refresh();
  });
  const guess = (k: LiftKey) => { const w = parseNum(est[k].w), r = parseNum(est[k].r); if (w && r) setTms((c) => ({ ...c, [k]: String(toDisplay(trainingMax(fromDisplay(w, units)!, r), units)) })); };

  return (
    <div className="rounded-2xl border-2 border-[color:var(--sk-line)] p-4" data-testid="wave">
      <button className="flex w-full items-center justify-between font-semibold" aria-expanded={open} onClick={() => setOpen((v) => !v)}>Training maxes and this week&apos;s weights<span aria-hidden>{open ? "−" : "+"}</span></button>
      {open && (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-text-light dark:text-darkmode-text-light">Training max = about 90% of your best single. Don&apos;t know it? Type a recent hard set (weight and reps) and tap Estimate.</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-3">
            {LIFTS.map((l) => (
              <div key={l.key} className="rounded-xl bg-[color:var(--sk-light)] p-3">
                <label htmlFor={`tm-${l.key}`} className="form-label">{l.label} training max ({units})</label>
                <input id={`tm-${l.key}`} inputMode="decimal" className="form-input" value={tms[l.key]} onChange={(e) => setTms((c) => ({ ...c, [l.key]: e.target.value }))} />
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm"><input aria-label={`${l.label} recent weight`} inputMode="decimal" className="form-input !w-20 !py-1.5" placeholder={units} value={est[l.key].w} onChange={(e) => setEst((c) => ({ ...c, [l.key]: { ...c[l.key], w: e.target.value } }))} />×<input aria-label={`${l.label} recent reps`} inputMode="numeric" className="form-input !w-16 !py-1.5" placeholder="reps" value={est[l.key].r} onChange={(e) => setEst((c) => ({ ...c, [l.key]: { ...c[l.key], r: e.target.value } }))} /><button type="button" className="soft-btn !px-3 !py-1 text-sm" onClick={() => guess(l.key)}>Estimate</button></div>
              </div>
            ))}
          </div>
          {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
          <button className="btn btn-outline-primary btn-sm" disabled={pending} onClick={save}>Save training maxes</button>

          {wave && (
            <>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Week of the cycle"><span className="text-sm font-semibold">Cycle {wave.cycle}, week</span>
                {WAVE.map((w) => <button key={w.week} aria-pressed={week === w.week} className={`rounded-full px-3 py-1 text-sm font-semibold ${week === w.week ? "bg-[color:var(--sk-accent)] text-[color:var(--sk-ink)]" : "bg-[color:var(--sk-light)]"}`} onClick={() => start(async () => { await setWaveWeek(w.week); router.refresh(); })}>{w.week}</button>)}
                <span className="text-sm text-text-light dark:text-darkmode-text-light">{WAVE[week - 1].label}</span></div>
              <div className="overflow-x-auto"><table className="w-full text-sm" data-testid="wave-table">
                <thead><tr className="text-left text-xs uppercase text-text-light dark:text-darkmode-text-light"><th className="py-1 pr-2">Lift</th>{WAVE[week - 1].sets.map((s, i) => <th key={i} className="py-1 pr-2">Set {i + 1} · {s.pct}%</th>)}<th /></tr></thead>
                <tbody>{LIFTS.map((l) => {
                  const base = wave[l.key];
                  return (
                    <tr key={l.key} className="border-t border-[color:var(--sk-line)]">
                      <td className="py-2 pr-2 font-semibold">{l.label}</td>
                      {base == null ? <td colSpan={3} className="py-2 text-text-light dark:text-darkmode-text-light">Set a training max first</td> : waveWeights(base, week).map((s, i) => <td key={i} className="py-2 pr-2 tabular-nums">{fmt(s.kg, units)} × {s.reps}{s.amrap && week < 4 ? "+" : ""}</td>)}
                      <td className="py-2 text-right">{base != null && <form action={startWaveSession.bind(null, l.key)}><button className="btn btn-primary btn-sm">Start</button></form>}</td>
                    </tr>
                  );
                })}</tbody></table></div>
              {week === 4 && <button className="btn btn-outline-primary btn-sm" disabled={pending} onClick={() => start(async () => { await finishWaveCycle(); router.refresh(); })}>Finish the cycle and raise my maxes</button>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- share ---------------- */
function Share({ routines, initialCode, onDone }: { routines: R[]; initialCode: string; onDone: (ok: boolean, text: string) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [code, setCode] = useState(""); const [copied, setCopied] = useState(false);
  const [incoming, setIncoming] = useState(initialCode); const [pending, start] = useTransition();
  const preview = incoming.trim() ? decodeShare(incoming) : null;

  const make = () => setCode(encodeShare(routines.filter((r) => picked.includes(r.id)).map((r) => ({ name: r.name, exercises: r.exercises }))));
  const link = code && typeof window !== "undefined" ? `${window.location.origin}/programs?import=${code}` : "";
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } };

  return (
    <section aria-label="Share workouts" className="grid gap-5 lg:grid-cols-2">
      <div className="card space-y-3 p-5">
        <h2 className="font-secondary text-xl font-bold">Share my workouts</h2>
        <p className="text-sm text-text-light dark:text-darkmode-text-light">Pick workouts, get a code, send it to a friend. They paste it here (or open your link) and the workouts appear in their app. No account details are shared.</p>
        {routines.length === 0 ? <p className="text-sm">You have no workouts yet.</p> : (
          <ul className="space-y-1.5">{routines.map((r) => <li key={r.id}><label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[color:var(--sk-accent)]" checked={picked.includes(r.id)} onChange={() => { setCode(""); setPicked((c) => (c.includes(r.id) ? c.filter((x) => x !== r.id) : [...c, r.id])); }} />{r.name}<span className="text-xs text-text-light dark:text-darkmode-text-light">{r.exercises.length} exercises</span></label></li>)}</ul>
        )}
        <button className="btn btn-primary btn-sm" disabled={!picked.length} onClick={make}>Create share code</button>
        {code && (
          <div className="space-y-2">
            <textarea readOnly aria-label="Share code" className="form-input h-24 font-mono text-xs" value={code} onFocus={(e) => e.currentTarget.select()} />
            <div className="flex flex-wrap gap-2"><button className="btn btn-outline-primary btn-sm" onClick={() => void copy(code)}>{copied ? "Copied" : "Copy code"}</button><button className="btn btn-outline-primary btn-sm" onClick={() => void copy(link)}>Copy link</button></div>
          </div>
        )}
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="font-secondary text-xl font-bold">Add a friend&apos;s workouts</h2>
        <label htmlFor="share-in" className="form-label">Paste a share code or link</label>
        <textarea id="share-in" className="form-input h-24 font-mono text-xs" value={incoming} onChange={(e) => setIncoming(e.target.value)} placeholder="CH1.…" />
        {incoming.trim() && !preview && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">That code doesn&apos;t look right. Copy the whole thing.</p>}
        {preview && (
          <div data-testid="share-preview"><p className="mb-1 text-sm font-semibold">{preview.length} workout{preview.length > 1 ? "s" : ""} in this code:</p>
            <ul className="space-y-1 text-sm">{preview.map((w, i) => <li key={i}><b>{w.name}</b> <span className="text-text-light dark:text-darkmode-text-light">{w.exercises.map((e) => EXERCISE_BY_ID[e.exerciseId]?.name).slice(0, 4).join(", ")}{w.exercises.length > 4 ? "…" : ""}</span></li>)}</ul>
            <button className="btn btn-primary btn-sm mt-3" disabled={pending} onClick={() => start(async () => { const r = await importShared(incoming); if (r.ok) { setIncoming(""); onDone(true, `${r.count} workout${r.count > 1 ? "s" : ""} added.`); } else onDone(false, r.error); })}>Add to my workouts</button></div>
        )}
      </div>
    </section>
  );
}
