"use client";

import FoodCheck from "./FoodCheck";
import { addFoodEntry, copyDay, deleteFoodEntry, getDayLog, recentFoods, removeMenuItem, updateFoodGrams } from "@/app/actions/food";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddFoodSheet from "./AddFoodSheet";
import { parseNum, ToastBar, type Toast } from "./FoodBits";

type Entry = { id: string; menuItemId: string | null; meal: string; name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number };
type Targets = { kcal: number; protein: number; carbs: number; fat: number };
type Per100 = { kcal: number; protein: number; carbs: number; fat: number };
const MEALS = [{ id: "breakfast", label: "Breakfast" }, { id: "lunch", label: "Lunch" }, { id: "dinner", label: "Dinner" }, { id: "snack", label: "Snacks" }] as const;
const defaultMeal = () => { const h = new Date().getHours(); return h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 21 ? "dinner" : "snack"; };
const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shift = (day: string, n: number) => { const d = new Date(day + "T12:00:00"); d.setDate(d.getDate() + n); return localDay(d); };
const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;

const COURSE: Record<string, string> = { breakfast: "i.", lunch: "ii.", dinner: "iii.", snack: "iv." };

const METERS = [
  { key: "protein", label: "Protein", unit: "g", bar: "bg-plate-blue dark:bg-darkmode-plate-blue" },
  { key: "carbs", label: "Carbs", unit: "g", bar: "bg-plate-yellow dark:bg-darkmode-plate-yellow" },
  { key: "fat", label: "Fat", unit: "g", bar: "bg-plate-green dark:bg-darkmode-plate-green" },
] as const;

function Meter({ label, value, goal, unit, bar }: { label: string; value: number; goal: number; unit: string; bar: string }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between"><span className="text-sm font-semibold text-text-dark dark:text-darkmode-text-dark">{label}</span><span className="text-sm tabular-nums"><b>{r0(value)}</b> / {goal} {unit}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-light dark:bg-darkmode-light" role="progressbar" aria-label={label} aria-valuenow={r0(value)} aria-valuemax={goal}>
        <motion.div className={`h-full rounded-full ${bar}`} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </div>
    </div>
  );
}

/** Today's food as a plate: the outer ring fills toward your calorie goal, the inner ring splits what you ate into protein, carbs and fat. */
function MacroPlate({ totals, goal }: { totals: Per100; goal: number }) {
  const pk = totals.protein * 4, ck = totals.carbs * 4, fk = totals.fat * 9;
  const sum = pk + ck + fk;
  const frac = goal > 0 ? Math.min(1, totals.kcal / goal) : 0;
  const GAP = 0.014;
  const segs = sum > 0 ? [
    { c: "text-plate-blue dark:text-darkmode-plate-blue", a: 0, b: pk / sum },
    { c: "text-plate-yellow dark:text-darkmode-plate-yellow", a: pk / sum, b: (pk + ck) / sum },
    { c: "text-plate-green dark:text-darkmode-plate-green", a: (pk + ck) / sum, b: 1 },
  ] : [];
  return (
    <div className="relative mx-auto h-44 w-44 sm:h-48 sm:w-48" role="progressbar" aria-label="Calories" aria-valuenow={r0(totals.kcal)} aria-valuemin={0} aria-valuemax={goal}>
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="90" cy="90" r="86" className="fill-card stroke-border dark:fill-darkmode-card dark:stroke-darkmode-border" strokeWidth="2" />
        <circle cx="90" cy="90" r="74" fill="none" className="stroke-light dark:stroke-darkmode-light" strokeWidth="9" />
        <motion.circle cx="90" cy="90" r="74" fill="none" strokeLinecap="round" strokeWidth="9" className={totals.kcal > goal ? "stroke-red-600" : "stroke-primary dark:stroke-darkmode-primary"} initial={{ pathLength: 0 }} animate={{ pathLength: Math.max(0.001, frac) }} transition={{ type: "spring", stiffness: 70, damping: 18, delay: 0.2 }} />
        {sum === 0 && <circle cx="90" cy="90" r="56" fill="none" stroke="currentColor" strokeWidth="9" strokeDasharray="2 7" strokeLinecap="round" className="text-border dark:text-darkmode-border" />}
        {segs.map((g, i) => (
          <motion.circle key={i} cx="90" cy="90" r="56" fill="none" stroke="currentColor" strokeWidth="9" className={g.c} initial={{ pathLength: 0, pathOffset: g.a }} animate={{ pathLength: Math.max(0.001, g.b - g.a - GAP), pathOffset: g.a + GAP / 2 }} transition={{ type: "spring", stiffness: 70, damping: 18, delay: 0.35 + i * 0.08 }} />
        ))}
        <circle cx="90" cy="90" r="44" fill="none" className="stroke-border dark:stroke-darkmode-border" strokeWidth="1" strokeDasharray="1 5" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-secondary text-4xl font-extrabold leading-none tabular-nums text-text-dark dark:text-darkmode-text-dark">{goal > 0 ? Math.round((totals.kcal / goal) * 100) : 0}<span className="text-xl">%</span></span>
        <span className="mt-1 text-xs uppercase tracking-[0.14em] text-text-light dark:text-darkmode-text-light">of goal</span>
      </div>
    </div>
  );
}

type Usual = Awaited<ReturnType<typeof recentFoods>>[number];

export default function FoodTracker({ goal, weightKg, diet, initialDay, hasDayParam, initialEntries, targets, lang, active, menuCount, onGoMenu }: { goal: string; weightKg: number | null; diet: string | null; initialDay: string; hasDayParam: boolean; initialEntries: Entry[]; targets: Targets; lang: string; active: boolean; menuCount: number; onGoMenu: () => void }) {
  const [day, setDay] = useState(initialDay);
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState<null | { meal: string; tab: "search" | "line" }>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [usuals, setUsuals] = useState<Usual[]>([]);
  const [quickMeal, setQuickMeal] = useState<string>(defaultMeal());
  const [toast, setToast] = useState<Toast | null>(null);
  const first = useRef(true);
  const wasActive = useRef(active);

  const say = useCallback((text: string, undo?: () => void | Promise<void>) => setToast({ text, undo, id: Date.now() }), []);
  const load = useCallback(async (d: string) => { setLoading(true); const rows = await getDayLog(d); setEntries(rows.map((e) => ({ id: e.id, menuItemId: e.menuItemId, meal: e.meal, name: e.name, grams: e.grams, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat }))); setLoading(false); }, []);
  const loadUsuals = useCallback(() => { void recentFoods().then(setUsuals); }, []);
  useEffect(() => {
    if (first.current) { first.current = false; loadUsuals(); if (!hasDayParam) { const t = localDay(); if (t !== initialDay) { setDay(t); void load(t); } } return; }
  }, [hasDayParam, initialDay, load, loadUsuals]);
  useEffect(() => { if (active && !wasActive.current) { void load(day); loadUsuals(); } wasActive.current = active; }, [active, day, load, loadUsuals]);
  const go = (d: string) => { setDay(d); setOpenId(null); void load(d); };

  const totals = useMemo(() => entries.reduce((a, e) => ({ kcal: a.kcal + e.kcal, protein: a.protein + e.protein, carbs: a.carbs + e.carbs, fat: a.fat + e.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }), [entries]);
  const left = targets.kcal - totals.kcal;
  const today = localDay();
  const title = day === today ? "Today" : day === shift(today, -1) ? "Yesterday" : new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  async function saveGrams(e: Entry) {
    const g = parseNum(editVal); setEditId(null);
    if (isNaN(g) || g < 1 || g === e.grams) return;
    await updateFoodGrams(e.id, g); void load(day);
  }

  const per100Of = (e: Entry) => ({ kcal: (e.kcal / e.grams) * 100, protein: (e.protein / e.grams) * 100, carbs: (e.carbs / e.grams) * 100, fat: (e.fat / e.grams) * 100 });
  const restore = async (e: Entry) => { await addFoodEntry({ day, meal: e.meal, name: e.name, grams: e.grams, per100: per100Of(e), menuItemId: e.menuItemId ?? undefined }); void load(day); };

  /** Take a food off this day. For a menu food that means "not today": the menu itself is untouched. */
  async function removeEntry(e: Entry) {
    setOpenId(null);
    setEntries((c) => c.filter((x) => x.id !== e.id));
    await deleteFoodEntry(e.id);
    say(e.menuItemId ? `${e.name}: not today` : `${e.name} removed`, () => restore(e));
  }
  async function dropFromMenu(e: Entry) {
    setOpenId(null);
    setEntries((c) => c.filter((x) => x.id !== e.id));
    await removeMenuItem(e.menuItemId!, day);
    say(`${e.name} is off your menu`);
  }
  async function quickAdd(u: Usual) {
    const per100 = { kcal: (u.kcal / u.grams) * 100, protein: (u.protein / u.grams) * 100, carbs: (u.carbs / u.grams) * 100, fat: (u.fat / u.grams) * 100 };
    const r = await addFoodEntry({ day, meal: quickMeal, name: u.name, grams: u.grams, per100 });
    await load(day);
    if (r.ok) say(`${u.name} added to ${MEALS.find((m) => m.id === quickMeal)?.label.toLowerCase()}`, async () => { await deleteFoodEntry(r.id); void load(day); });
  }
  async function copyYesterday() {
    const r = await copyDay({ from: shift(day, -1), to: day });
    await load(day);
    say(r.count ? `Copied ${r.count} food${r.count > 1 ? "s" : ""} from ${day === today ? "yesterday" : "the day before"}` : "Nothing new to copy");
  }

  const menuRows = entries.filter((e) => e.menuItemId).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button className="btn btn-outline-primary btn-sm" onClick={() => go(shift(day, -1))} aria-label="Previous day">‹ Previous</button>
        <div className="text-center"><p className="font-secondary text-3xl font-black text-text-dark dark:text-darkmode-text-dark">{title}</p>{day !== today && <button className="text-sm font-semibold text-primary underline dark:text-darkmode-primary" onClick={() => go(today)}>Back to today</button>}</div>
        <button className="btn btn-outline-primary btn-sm" onClick={() => go(shift(day, 1))} disabled={day >= today} aria-label="Next day">Next ›</button>
      </div>

      <section className="card overflow-hidden" aria-label="Daily totals">
        <div className="gingham h-3" aria-hidden />
        <div className="grid gap-6 p-6 sm:grid-cols-[12rem_1fr] sm:items-center">
          <MacroPlate totals={totals} goal={targets.kcal} />
          <div>
            <div className="mb-5">
              <p className="font-secondary text-6xl font-extrabold leading-none text-text-dark tabular-nums dark:text-darkmode-text-dark">{r0(totals.kcal)}<span className="ml-2 text-xl font-bold text-text-light">of {targets.kcal} kcal</span></p>
              <p className={`mt-1.5 font-semibold ${left < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{left >= 0 ? `${r0(left)} kcal left today` : `${r0(-left)} kcal over your goal`}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">{METERS.map((m) => <Meter key={m.key} label={m.label} unit={m.unit} bar={m.bar} value={totals[m.key]} goal={targets[m.key]} />)}</div>
          </div>
        </div>
      </section>

      <FoodCheck day={day} today={today} goal={goal} weightKg={weightKg} diet={diet} targets={targets} entries={entries} />

      <section className="card p-4 sm:p-5" aria-label="Quick add">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="h5">Quick add</h2>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Quick add to">
            {MEALS.map((m) => <button key={m.id} aria-pressed={quickMeal === m.id} onClick={() => setQuickMeal(m.id)} className={`rounded-full px-3 py-1 text-xs font-bold ${quickMeal === m.id ? "bg-primary text-white dark:bg-darkmode-primary dark:text-text-dark" : "bg-light dark:bg-darkmode-light"}`}>{m.label}</button>)}
          </div>
        </div>
        {usuals.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {usuals.slice(0, 10).map((u) => <button key={u.name} className="quick-chip" onClick={() => void quickAdd(u)} title={`${r0(u.kcal)} kcal`}><span className="truncate">{u.name.length > 26 ? u.name.slice(0, 26) + "…" : u.name}</span><span className="text-xs font-semibold text-text-light dark:text-darkmode-text-light">{r0(u.grams)} g</span></button>)}
          </div>
        ) : <p className="mt-2 text-sm">Foods you add will show up here, one tap to log them again.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary btn-sm" onClick={() => setSheet({ meal: quickMeal, tab: "line" })}>Type a whole meal</button>
          <button className="btn btn-outline-primary btn-sm" onClick={() => void copyYesterday()}>Copy {day === today ? "yesterday" : "the day before"}</button>
        </div>
      </section>

      {menuCount === 0 && entries.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-primary/40 px-5 py-4 dark:border-darkmode-primary/40">
          <p className="max-w-xl text-sm"><b className="text-text-dark dark:text-darkmode-text-dark">Eat the same things most days?</b> Put them in a set menu once. They land in your day by themselves and you only change what was different.</p>
          <button className="btn btn-outline-primary btn-sm" onClick={onGoMenu}>Build my menu</button>
        </div>
      )}
      {menuRows > 0 && <p className="text-sm text-text-light dark:text-darkmode-text-light">Foods marked <span className="menu-tag">Menu</span> came from your set menu. Tap ⋯ if you didn&apos;t eat one today.</p>}

      <div className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
        {MEALS.map((m) => {
          const rows = entries.filter((e) => e.meal === m.id);
          const k = rows.reduce((a, e) => a + e.kcal, 0);
          return (
            <section key={m.id} className="card overflow-hidden" aria-label={m.label}>
              <header className="flex items-center gap-3 border-b border-border px-5 py-3.5 dark:border-darkmode-border">
                <span className="course-no" aria-hidden>{COURSE[m.id]}</span>
                <h2 className="h5">{m.label}</h2>
                <span className="leader" aria-hidden />
                <span className="text-sm font-semibold tabular-nums">{rows.length ? `${r0(k)} kcal` : ""}</span>
                <button className="btn btn-primary btn-sm" onClick={() => setSheet({ meal: m.id, tab: "search" })}>Add food</button>
              </header>
              <ul>
                <AnimatePresence initial={false}>
                  {rows.map((e) => (
                    <motion.li layout key={e.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-b border-border last:border-0 dark:border-darkmode-border">
                      <div className="flex items-center gap-3 px-5 py-3">
                        <div className="min-w-0 grow">
                          <div className="flex items-baseline gap-2">{e.menuItemId && <span className="menu-tag">Menu</span>}<span className="truncate font-semibold text-text-dark dark:text-darkmode-text-dark">{e.name}</span><span className="leader" aria-hidden /><span className="shrink-0 font-bold tabular-nums text-text-dark dark:text-darkmode-text-dark">{r0(e.kcal)} <span className="text-xs font-semibold text-text-light dark:text-darkmode-text-light">kcal</span></span></div>
                          <p className="text-sm tabular-nums text-text-light dark:text-darkmode-text-light">P {r0(e.protein)} · C {r0(e.carbs)} · F {r0(e.fat)}</p>
                        </div>
                        {editId === e.id ? (
                          <form onSubmit={(ev) => { ev.preventDefault(); void saveGrams(e); }} className="flex items-center gap-1"><input autoFocus aria-label="Grams" inputMode="decimal" className="form-input !w-20 !px-2 !py-1.5 text-center" value={editVal} onChange={(ev) => setEditVal(ev.target.value)} onBlur={() => void saveGrams(e)} /><span className="text-sm">g</span></form>
                        ) : (
                          <button className="shrink-0 whitespace-nowrap rounded-lg bg-light px-3 py-1.5 text-sm font-semibold tabular-nums dark:bg-darkmode-light" onClick={() => { setEditId(e.id); setEditVal(String(r1(e.grams))); }} aria-label={`${e.name}, ${r1(e.grams)} grams. Change amount`}>{r1(e.grams)} g</button>
                        )}
                        {e.menuItemId
                          ? <button className="px-2 text-xl font-bold leading-none text-text-light hover:text-primary" aria-label={`Options for ${e.name}`} aria-expanded={openId === e.id} onClick={() => setOpenId(openId === e.id ? null : e.id)}>⋯</button>
                          : <button className="px-2 text-xl text-text-light hover:text-red-600" aria-label={`Remove ${e.name}`} onClick={() => void removeEntry(e)}>×</button>}
                      </div>
                      <AnimatePresence initial={false}>
                        {openId === e.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-light/60 dark:bg-darkmode-light/50">
                            <div className="flex flex-wrap items-center gap-2 px-5 py-3">
                              <button className="btn btn-outline-primary btn-sm" onClick={() => void removeEntry(e)}>Didn&apos;t eat it today</button>
                              <button className="btn btn-outline-primary btn-sm !border-red-500 !text-red-600 hover:!bg-red-600 hover:!text-white" onClick={() => void dropFromMenu(e)}>Take it off my menu</button>
                              <span className="text-xs text-text-light dark:text-darkmode-text-light">The first one only skips today.</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  ))}
                </AnimatePresence>
                {!rows.length && <li className="px-5 py-4 text-sm text-text-light dark:text-darkmode-text-light">Nothing logged yet.</li>}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="text-xs text-text-light dark:text-darkmode-text-light">Food data: USDA Food and Nutrient Database for Dietary Studies (public domain, per 100 g) plus Charge&apos;s own list of world dishes. Values are estimates. Calories are worked out from protein, carbs and fat.</p>

      <AnimatePresence>{sheet && <AddFoodSheet key="sheet" day={day} initialMeal={sheet.meal} initialTab={sheet.tab} lang={lang} mode="log" onClose={() => setSheet(null)} onAdded={(msg) => { say(msg); void load(day); loadUsuals(); }} />}</AnimatePresence>
      <ToastBar toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
