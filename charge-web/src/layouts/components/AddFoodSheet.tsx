"use client";

import BarcodeScan from "./BarcodeScan";
import { addFoodEntry, addManyFoods, addMenuFood, createCustomFood, recentFoods, resolveLine, searchFood, type FoodHit, type LineGuess } from "@/app/actions/food";
import { useEffect, useState } from "react";
import { pieceFor, type Piece } from "@/lib/pieces";
import { defaultMeal, MEALS, parseNum, pill, r0, r1, Sheet } from "./FoodBits";

type Per100 = { kcal: number; protein: number; carbs: number; fat: number };
const calc = (p: Per100, g: number) => ({ kcal: (p.kcal * g) / 100, protein: (p.protein * g) / 100, carbs: (p.carbs * g) / 100, fat: (p.fat * g) / 100 });
const hitPer100 = (h: FoodHit): Per100 => ({ kcal: h.kcal, protein: h.protein, carbs: h.carbs, fat: h.fat });

/** Search, type a whole line, or pick from your usuals. "Every day" puts it in your set menu too. */
export default function AddFoodSheet({ day, initialMeal, initialTab = "search", lang, mode, onClose, onAdded }: { day: string; initialMeal: string; initialTab?: "search" | "line" | "scan"; lang: string; mode: "log" | "menu"; onClose: () => void; onAdded: (msg: string) => void }) {
  const [tab, setTab] = useState<"search" | "line" | "scan">(initialTab);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<FoodHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [parsedGrams, setParsedGrams] = useState<number | null>(null);
  const [recent, setRecent] = useState<Awaited<ReturnType<typeof recentFoods>>>([]);
  const [picked, setPicked] = useState<null | { name: string; per100: Per100; serving: number | null; piece: Piece | null }>(null);
  const [grams, setGrams] = useState("100");
  const [unit, setUnit] = useState<"g" | "piece">("g");
  const [count, setCount] = useState("1");
  const [meal, setMeal] = useState(initialMeal || defaultMeal());
  const [repeat, setRepeat] = useState(mode === "menu");
  const [custom, setCustom] = useState<false | CustomInit>(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { void recentFoods().then(setRecent); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); setParsedGrams(null); return; }
    setSearching(true);
    const t = setTimeout(async () => { const r = await searchFood(q, lang); setHits(r.hits); setParsedGrams(r.grams); setSearching(false); }, 200);
    return () => clearTimeout(t);
  }, [q, lang]);

  const pick = (h: FoodHit) => {
    setPicked({ name: h.name, per100: hitPer100(h), serving: h.servingGrams, piece: h.piece ?? null });
    setGrams(String(parsedGrams ?? h.servingGrams ?? 100));
    // an egg or a banana is counted, not weighed: start on pieces unless the person typed grams
    setUnit(h.piece && parsedGrams == null ? "piece" : "g"); setCount("1"); setErr("");
  };
  const byPiece = !!picked?.piece && unit === "piece";
  const n = parseNum(count);
  const g = byPiece ? Math.round(n * picked!.piece!.g * 10) / 10 : parseNum(grams);
  const m = picked && !isNaN(g) ? calc(picked.per100, g) : null;

  async function add() {
    if (!picked || isNaN(g) || g <= 0) return setErr(byPiece ? "Enter how many." : "Enter the amount in grams.");
    setBusy(true);
    const r = mode === "menu"
      ? await addMenuFood({ day, meal, name: picked.name, grams: g, per100: picked.per100 })
      : await addFoodEntry({ day, meal, name: picked.name, grams: g, per100: picked.per100, repeat });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    onAdded(mode === "menu" ? `${picked.name} is on your menu` : repeat ? `${picked.name} added, and it will come every day` : `${picked.name} added`);
    onClose();
  }

  const title = picked ? "How much?" : custom ? (custom.source === "off" ? "Check the numbers" : "Your own food") : tab === "line" ? "Type it all at once" : tab === "scan" ? "Scan a barcode" : mode === "menu" ? "Add to my menu" : "Add food";
  return (
    <Sheet label={mode === "menu" ? "Add to menu" : "Add food"} title={title} onClose={onClose}>
      {!picked && !custom && (
        <div className="flex min-h-0 grow flex-col">
          <div className="flex gap-2 px-4 pt-3" role="tablist" aria-label="How to add">
            <button role="tab" aria-selected={tab === "search"} className={pill(tab === "search")} onClick={() => setTab("search")}>Search</button>
            <button role="tab" aria-selected={tab === "line"} className={pill(tab === "line")} onClick={() => setTab("line")}>Type a whole meal</button>
            <button role="tab" aria-selected={tab === "scan"} className={pill(tab === "scan")} onClick={() => setTab("scan")}>Scan</button>
          </div>

          {tab === "search" && (
            <>
              <div className="p-4 pb-2">
                <label htmlFor="fsearch" className="sr-only">Search foods</label>
                <input id="fsearch" autoFocus className="form-input" placeholder="Any language: 150 g poulet, tajine, كسكس, pollo…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
              </div>
              <div className="min-h-[14rem] grow overflow-y-auto px-2 pb-2">
                {q.trim().length < 2 && recent.length > 0 && (
                  <div className="px-2 pb-2"><p className="mb-2 text-sm font-semibold">Your usuals</p><div className="flex flex-wrap gap-2">{recent.map((r) => <button key={r.name} className="rounded-full bg-light px-3 py-1.5 text-sm font-semibold dark:bg-darkmode-light" onClick={() => { setPicked({ name: r.name, per100: { kcal: (r.kcal / r.grams) * 100, protein: (r.protein / r.grams) * 100, carbs: (r.carbs / r.grams) * 100, fat: (r.fat / r.grams) * 100 }, serving: null, piece: pieceFor(r.name) }); setUnit("g"); setGrams(String(r1(r.grams))); }}>{r.name.length > 28 ? r.name.slice(0, 28) + "…" : r.name}</button>)}</div></div>
                )}
                {q.trim().length >= 2 && !searching && hits.length === 0 && <p className="px-3 py-4">No match. Try a simpler word (&ldquo;chicken&rdquo;), or add it yourself below.</p>}
                <ul>
                  {hits.map((h) => (
                    <li key={h.key}><button className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-light dark:hover:bg-darkmode-light" onClick={() => pick(h)}>
                      <span className="min-w-0"><span className="block truncate font-semibold text-text-dark dark:text-darkmode-text-dark">{h.name}</span><span className="block truncate text-xs text-text-light dark:text-darkmode-text-light">{h.sub}</span></span>
                      <span className="shrink-0 text-right text-xs tabular-nums"><b className="text-sm text-text-dark dark:text-darkmode-text-dark">{r0(h.kcal)} kcal</b><br />P {r0(h.protein)} · C {r0(h.carbs)} · F {r0(h.fat)}<br /><span className="text-text-light">per 100 g</span></span>
                    </button></li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-border p-3 text-center dark:border-darkmode-border"><button className="text-sm font-semibold text-primary underline dark:text-darkmode-primary" onClick={() => setCustom({})}>Can&apos;t find it? Add your own food</button></div>
            </>
          )}

          {tab === "scan" && <BarcodeScan onMine={pick} onOff={(p) => setCustom({ name: p.name, kcal: p.kcal, protein: p.protein, carbs: p.carbs, fat: p.fat, serving: p.servingGrams, barcode: p.barcode, source: "off" })} onNone={(b) => setCustom({ barcode: b, notFound: true })} />}
          {tab === "line" && <LineAdd day={day} initialMeal={meal} lang={lang} mode={mode} onDone={(msg) => { onAdded(msg); onClose(); }} />}
        </div>
      )}

      {picked && (
        <div className="space-y-5 overflow-y-auto p-5">
          <div><p className="font-semibold text-text-dark dark:text-darkmode-text-dark">{picked.name}</p><p className="text-sm tabular-nums text-text-light dark:text-darkmode-text-light">per 100 g: {r0(picked.per100.kcal)} kcal · P {r1(picked.per100.protein)} · C {r1(picked.per100.carbs)} · F {r1(picked.per100.fat)}</p></div>
          <div>
            {picked.piece && (
              <div className="mb-3 inline-flex rounded-full bg-light p-1 dark:bg-darkmode-light" role="radiogroup" aria-label="Measure by">
                {([["piece", `By the ${picked.piece.one}`], ["g", "In grams"]] as const).map(([u, t]) => <button key={u} type="button" role="radio" aria-checked={unit === u} data-testid={`unit-${u}`} onClick={() => { if (u === unit) return; if (u === "g" && !isNaN(g)) setGrams(String(Math.round(g))); if (u === "piece" && picked.piece && !isNaN(parseNum(grams))) setCount(String(Math.max(0.5, Math.round((parseNum(grams) / picked.piece.g) * 2) / 2))); setUnit(u); }} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${unit === u ? "bg-primary text-white dark:bg-darkmode-primary dark:text-dark" : "text-text-dark dark:text-darkmode-text-dark"}`}>{t}</button>)}
              </div>
            )}
            {byPiece ? (
              <>
                <label htmlFor="fcount" className="form-label">How many {picked.piece!.many}?</label>
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="One less" className="grid size-12 shrink-0 place-items-center rounded-full bg-light text-2xl font-bold dark:bg-darkmode-light" onClick={() => setCount(String(Math.max(0.5, (isNaN(n) ? 1 : n) - 0.5)))}>−</button>
                  <input id="fcount" autoFocus inputMode="decimal" className="form-input !text-center !text-2xl font-bold tabular-nums" value={count} onChange={(e) => setCount(e.target.value.replace(/[^0-9.,]/g, ""))} onKeyDown={(e) => e.key === "Enter" && void add()} />
                  <button type="button" aria-label="One more" className="grid size-12 shrink-0 place-items-center rounded-full bg-light text-2xl font-bold dark:bg-darkmode-light" onClick={() => setCount(String((isNaN(n) ? 0 : n) + 1))}>+</button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {[1, 2, 3, 4, 6].map((c) => <button key={c} type="button" className="rounded-full bg-light px-3 py-1 text-sm font-semibold dark:bg-darkmode-light" onClick={() => setCount(String(c))}>{c}</button>)}
                  <span className="text-sm tabular-nums text-text-light dark:text-darkmode-text-light" data-testid="piece-total">1 {picked.piece!.one} ≈ {picked.piece!.g} g{!isNaN(g) ? ` · ${r0(g)} g in all` : ""}</span>
                </div>
              </>
            ) : (
              <>
                <label htmlFor="fgrams" className="form-label">Amount (grams)</label>
                <input id="fgrams" autoFocus inputMode="decimal" className="form-input !text-2xl font-bold tabular-nums" value={grams} onChange={(e) => setGrams(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void add()} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[50, 100, 150, 200, 250].map((x) => <button key={x} type="button" className="rounded-full bg-light px-3 py-1 text-sm font-semibold dark:bg-darkmode-light" onClick={() => setGrams(String(x))}>{x} g</button>)}
                  {picked.serving && !picked.piece && <button type="button" className="rounded-full bg-light px-3 py-1 text-sm font-semibold dark:bg-darkmode-light" onClick={() => setGrams(String(picked.serving))}>1 serving ({picked.serving} g)</button>}
                </div>
              </>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 rounded-xl bg-light p-4 text-center dark:bg-darkmode-light" aria-live="polite">
            {[["Calories", m ? r0(m.kcal) : "—"], ["Protein", m ? `${r1(m.protein)} g` : "—"], ["Carbs", m ? `${r1(m.carbs)} g` : "—"], ["Fat", m ? `${r1(m.fat)} g` : "—"]].map(([k, v]) => <div key={k}><p className="text-xs">{k}</p><p className="font-secondary text-2xl font-black text-text-dark dark:text-darkmode-text-dark tabular-nums">{v}</p></div>)}
          </div>
          <div><span className="form-label">{mode === "menu" ? "Menu meal" : "Add to"}</span><div className="flex flex-wrap gap-2">{MEALS.map((x) => <button key={x.id} type="button" aria-pressed={meal === x.id} onClick={() => setMeal(x.id)} className={pill(meal === x.id)}>{x.label}</button>)}</div></div>
          {mode === "log" && <WhenToggle repeat={repeat} setRepeat={setRepeat} />}
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          <div className="flex justify-between gap-3"><button className="btn btn-outline-primary" onClick={() => setPicked(null)}>Back</button><button className="btn btn-primary grow" disabled={busy} onClick={() => void add()}>{busy ? "Adding…" : mode === "menu" ? "Add to my menu" : repeat ? "Add, every day" : "Add to my day"}</button></div>
        </div>
      )}

      {custom && !picked && <CustomFoodForm init={custom} onCancel={() => setCustom(false)} onCreated={(h) => { setCustom(false); pick(h); }} />}
    </Sheet>
  );
}

/** "Just today" or "Every day": the one choice that makes the set menu easy to build. */
function WhenToggle({ repeat, setRepeat }: { repeat: boolean; setRepeat: (v: boolean) => void }) {
  return (
    <div>
      <span className="form-label">How often</span>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How often">
        {([[false, "Just today", "Quick add for this day only"], [true, "Every day", "Goes in my menu and comes by itself"]] as const).map(([v, t, d]) => (
          <button key={t} type="button" role="radio" aria-checked={repeat === v} onClick={() => setRepeat(v)} className={`rounded-xl border-2 px-3 py-2.5 text-left transition-colors ${repeat === v ? "border-primary bg-primary/10 dark:border-darkmode-primary dark:bg-darkmode-primary/15" : "border-border hover:border-primary/50 dark:border-darkmode-border"}`}>
            <span className="block text-sm font-bold text-text-dark dark:text-darkmode-text-dark">{t}</span><span className="block text-xs text-text-light dark:text-darkmode-text-light">{d}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type Guess = LineGuess & { idx: number; g: string; off: boolean };
/** Type "2 eggs, rice 200 g, chicken breast 150" and the whole meal is found for you. */
function LineAdd({ day, initialMeal, lang, mode, onDone }: { day: string; initialMeal: string; lang: string; mode: "log" | "menu"; onDone: (msg: string) => void }) {
  const [text, setText] = useState("");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [finding, setFinding] = useState(false);
  const [meal, setMeal] = useState(initialMeal);
  const [repeat, setRepeat] = useState(mode === "menu");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (text.trim().length < 2) { setGuesses([]); return; }
    setFinding(true);
    const t = setTimeout(async () => {
      const r = await resolveLine(text, lang);
      setGuesses((old) => r.map((x) => { const o = old.find((y) => y.text === x.text); return o ? { ...x, idx: o.idx, g: o.g, off: o.off } : { ...x, idx: 0, g: String(x.grams), off: false }; }));
      setFinding(false);
    }, 450);
    return () => clearTimeout(t);
  }, [text, lang]);

  const live = guesses.filter((x) => !x.off && x.hits[x.idx] && !isNaN(parseNum(x.g)));
  const total = live.reduce((a, x) => a + (x.hits[x.idx].kcal * parseNum(x.g)) / 100, 0);

  async function go() {
    if (!live.length) return setErr("Nothing to add yet.");
    setBusy(true);
    const items = live.map((x) => ({ name: x.hits[x.idx].name, grams: parseNum(x.g), per100: hitPer100(x.hits[x.idx]) }));
    const r = mode === "menu"
      ? await Promise.all(items.map((it) => addMenuFood({ day, meal, name: it.name, grams: it.grams, per100: it.per100 }))).then((rs) => rs.find((x) => !x.ok) ?? { ok: true as const })
      : await addManyFoods({ day, meal, items, repeat });
    setBusy(false);
    if (!r.ok) return setErr("error" in r ? r.error : "Something went wrong.");
    onDone(`${items.length} food${items.length > 1 ? "s" : ""} added`);
  }

  return (
    <div className="flex min-h-0 grow flex-col">
      <div className="space-y-3 overflow-y-auto p-4">
        <div>
          <label htmlFor="fline" className="sr-only">Describe the meal</label>
          <textarea id="fline" autoFocus rows={2} className="form-input" placeholder="2 eggs, rice 200 g, chicken breast 150, banana" value={text} onChange={(e) => setText(e.target.value)} />
          <p className="mt-1 text-xs text-text-light dark:text-darkmode-text-light">Separate foods with commas. Add an amount like 200 g, a count like 2 eggs, or nothing at all.</p>
        </div>
        {finding && guesses.length === 0 && <p className="text-sm">Looking…</p>}
        <ul className="space-y-2">
          {guesses.map((x, i) => {
            const h = x.hits[x.idx];
            return (
              <li key={x.text + i} className={`rounded-xl border border-border p-3 dark:border-darkmode-border ${x.off ? "opacity-50" : ""}`}>
                {h ? (
                  <>
                    <div className="flex items-center gap-2">
                      <select aria-label={`Match for ${x.text}`} className="form-input !py-1.5 text-sm font-semibold" value={x.idx} onChange={(e) => setGuesses((c) => c.map((y, j) => (j === i ? { ...y, idx: +e.target.value } : y)))}>
                        {x.hits.map((o, k) => <option key={o.key} value={k}>{o.name}</option>)}
                      </select>
                      <input aria-label={`Grams of ${h.name}`} inputMode="decimal" className="form-input !w-20 !px-2 !py-1.5 text-center tabular-nums" value={x.g} onChange={(e) => setGuesses((c) => c.map((y, j) => (j === i ? { ...y, g: e.target.value } : y)))} />
                      <span className="text-sm">g</span>
                      <button className="px-1.5 text-xl text-text-light hover:text-red-600" aria-label={`Remove ${x.text}`} onClick={() => setGuesses((c) => c.map((y, j) => (j === i ? { ...y, off: !y.off } : y)))}>{x.off ? "↺" : "×"}</button>
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-text-light dark:text-darkmode-text-light">{r0((h.kcal * (parseNum(x.g) || 0)) / 100)} kcal · {h.sub}</p>
                  </>
                ) : <p className="text-sm">No match for &ldquo;{x.text}&rdquo;. Try another word.</p>}
              </li>
            );
          })}
        </ul>
      </div>
      {guesses.length > 0 && (
        <div className="space-y-3 border-t border-border p-4 dark:border-darkmode-border">
          <div className="flex flex-wrap gap-2">{MEALS.map((x) => <button key={x.id} type="button" aria-pressed={meal === x.id} onClick={() => setMeal(x.id)} className={pill(meal === x.id)}>{x.label}</button>)}</div>
          {mode === "log" && <WhenToggle repeat={repeat} setRepeat={setRepeat} />}
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          <button className="btn btn-primary w-full" disabled={busy || !live.length} onClick={() => void go()}>{busy ? "Adding…" : `Add ${live.length} food${live.length === 1 ? "" : "s"} · ${r0(total)} kcal`}</button>
        </div>
      )}
    </div>
  );
}

type CustomInit = { name?: string; kcal?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null; serving?: number | null; barcode?: string; source?: "off"; notFound?: boolean };
const s0 = (n: number | null | undefined) => (n == null ? "" : String(n));
function CustomFoodForm({ init, onCancel, onCreated }: { init?: CustomInit; onCancel: () => void; onCreated: (h: FoodHit) => void }) {
  const [f, setF] = useState({ name: init?.name ?? "", kcal: s0(init?.kcal), protein: s0(init?.protein), carbs: s0(init?.carbs), fat: s0(init?.fat), serving: s0(init?.serving) });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((c) => ({ ...c, [k]: v }));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = { kcal: parseNum(f.kcal), protein: parseNum(f.protein), carbs: parseNum(f.carbs), fat: parseNum(f.fat) };
    if (!f.name.trim() || Object.values(n).some(isNaN)) return setErr("Fill in the name and all four numbers (per 100 g, from the label).");
    setBusy(true);
    const r = await createCustomFood({ name: f.name, ...n, servingGrams: f.serving ? parseNum(f.serving) : null, barcode: init?.barcode, source: init?.source });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    onCreated(r.hit);
  }
  return (
    <form onSubmit={save} className="space-y-4 overflow-y-auto p-5">
      {init?.source === "off" ? (
        <p className="text-sm">Found it. Check these numbers (per 100 g) against the label, fix anything that looks off, then save. Next time you scan it, it comes straight from your foods.</p>
      ) : init?.notFound ? (
        <p className="text-sm">Open Food Facts doesn&apos;t know this barcode yet. Copy the numbers <b>per 100 g</b> from the label and we&apos;ll remember it for your next scan.</p>
      ) : (
        <p className="text-sm">Copy the numbers <b>per 100 g</b> from the label. We&apos;ll save it so you can find it again.</p>
      )}
      <div><label className="form-label" htmlFor="cf-n">Name</label><input id="cf-n" autoFocus className="form-input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Choco protein bar" /></div>
      <div className="grid grid-cols-2 gap-3">
        {([["kcal", "Calories (kcal)"], ["protein", "Protein (g)"], ["carbs", "Carbs (g)"], ["fat", "Fat (g)"]] as const).map(([k, l]) => <div key={k}><label className="form-label" htmlFor={`cf-${k}`}>{l}</label><input id={`cf-${k}`} inputMode="decimal" className="form-input" value={f[k]} onChange={(e) => set(k, e.target.value)} /></div>)}
      </div>
      <div><label className="form-label" htmlFor="cf-s">One serving weighs (g) <span className="font-normal text-text-light">optional, e.g. 45 for one bar</span></label><input id="cf-s" inputMode="decimal" className="form-input !w-32" value={f.serving} onChange={(e) => set("serving", e.target.value)} /></div>
      {init?.source === "off" && <p className="text-xs text-text-light dark:text-darkmode-text-light">Source: <a className="underline" href={`https://world.openfoodfacts.org/product/${init.barcode}`} target="_blank" rel="noreferrer">Open Food Facts</a> (ODbL).</p>}
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <div className="flex justify-between gap-3"><button type="button" className="btn btn-outline-primary" onClick={onCancel}>Back</button><button className="btn btn-primary grow" disabled={busy}>{busy ? "Saving…" : "Save and use"}</button></div>
    </form>
  );
}
