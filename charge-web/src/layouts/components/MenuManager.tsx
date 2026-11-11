"use client";

import { getMenu, removeMenuItem, saveDayAsMenu, setMenuOn, updateMenuItem, type MenuRow } from "@/app/actions/food";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AddFoodSheet from "./AddFoodSheet";
import { localDay, MEALS, parseNum, pill, r0, r1, ToastBar, type Toast } from "./FoodBits";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ALL = 127;

/** The set menu: foods that arrive in your day by themselves, on the days you choose. */
export default function MenuManager({ lang, onChanged }: { lang: string; onChanged: (count: number) => void }) {
  const [items, setItems] = useState<MenuRow[] | null>(null);
  const [on, setOn] = useState(true);
  const [sheet, setSheet] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [viewDay, setViewDay] = useState(() => (new Date().getDay() + 6) % 7);
  const today = localDay();

  const load = useCallback(async () => { const m = await getMenu(); setItems(m.items); setOn(m.on); onChanged(m.items.length); }, [onChanged]);
  useEffect(() => { void load(); }, [load]);
  const say = (text: string) => setToast({ text, id: Date.now() });

  const dayTotals = useMemo(() => (items ?? []).filter((i) => i.days & (1 << viewDay)).reduce((a, i) => ({ kcal: a.kcal + i.kcal, protein: a.protein + i.protein, carbs: a.carbs + i.carbs, fat: a.fat + i.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }), [items, viewDay]);

  async function toggleDay(i: MenuRow, d: number) {
    const next = i.days ^ (1 << d);
    if (next === 0) return say("Keep at least one day, or remove the food.");
    setItems((c) => c!.map((x) => (x.id === i.id ? { ...x, days: next } : x)));
    await updateMenuItem({ id: i.id, days: next });
  }
  async function saveGrams(i: MenuRow) {
    const g = parseNum(editVal); setEditId(null);
    if (isNaN(g) || g < 1 || g === i.grams) return;
    await updateMenuItem({ id: i.id, grams: g });
    void load();
  }
  async function remove(i: MenuRow) {
    setItems((c) => c!.filter((x) => x.id !== i.id));
    await removeMenuItem(i.id, today);
    say(`${i.name} is off your menu`);
    void load();
  }
  async function fromToday() {
    const r = await saveDayAsMenu(today);
    say(r.count ? `${r.count} food${r.count > 1 ? "s" : ""} from today are now your menu` : "Nothing new to add. Log some foods first.");
    void load();
  }
  async function flip() { const v = !on; setOn(v); await setMenuOn(v); say(v ? "Menu is on" : "Menu paused. Your days stay empty until you log."); }

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="gingham h-3" aria-hidden />
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="max-w-xl">
            <h2 className="h4">Your set menu</h2>
            <p className="mt-1 text-sm">What you eat on a normal day. It drops into your log by itself, so you only fix what was different. Each day you can say &ldquo;didn&apos;t eat it&rdquo; with one tap, or just add something extra.</p>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-full bg-light px-4 py-2 font-semibold dark:bg-darkmode-light">
            <span>{on ? "Menu on" : "Menu paused"}</span>
            <button role="switch" aria-checked={on} onClick={() => void flip()} className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-primary dark:bg-darkmode-primary" : "bg-border dark:bg-darkmode-border"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform left-0.5 ${on ? "translate-x-5" : ""}`} /></button>
          </label>
        </div>
      </section>

      <section className="card p-4 sm:p-5" aria-label="Menu totals">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Preview a weekday">
          <span className="mr-1 text-sm font-semibold">A typical</span>
          {DAY_NAMES.map((n, d) => <button key={n} aria-pressed={viewDay === d} onClick={() => setViewDay(d)} className={`rounded-full px-2.5 py-1 text-xs font-bold ${viewDay === d ? "bg-primary text-white dark:bg-darkmode-primary dark:text-text-dark" : "bg-light dark:bg-darkmode-light"}`}>{n.slice(0, 3)}</button>)}
        </div>
        <p className="mt-3 font-secondary text-4xl font-extrabold tabular-nums text-text-dark dark:text-darkmode-text-dark">{r0(dayTotals.kcal)}<span className="ml-2 text-base font-bold text-text-light"> kcal</span></p>
        <p className="text-sm tabular-nums">P {r0(dayTotals.protein)} g · C {r0(dayTotals.carbs)} g · F {r0(dayTotals.fat)} g</p>
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary btn-sm" onClick={() => setSheet("breakfast")}>Add a food to my menu</button>
        <button className="btn btn-outline-primary btn-sm" onClick={() => void fromToday()}>Use what I logged today as my menu</button>
      </div>

      {items === null ? <p>Loading…</p> : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center dark:border-darkmode-border">
          <p className="font-secondary text-2xl font-black text-text-dark dark:text-darkmode-text-dark">No menu yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm">Add the foods you eat most days, or log a normal day and press &ldquo;Use what I logged today&rdquo;. You can still add anything for just one day from the Today tab.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {MEALS.map((m) => {
            const rows = items.filter((i) => i.meal === m.id);
            if (!rows.length) return null;
            return (
              <section key={m.id} className="card overflow-hidden" aria-label={m.label}>
                <header className="flex items-center gap-3 border-b border-border px-5 py-3 dark:border-darkmode-border"><h3 className="h5">{m.label}</h3><span className="leader" aria-hidden /><span className="text-sm font-semibold tabular-nums">{r0(rows.filter((i) => i.days & (1 << viewDay)).reduce((a, i) => a + i.kcal, 0))} kcal</span><button className="btn btn-outline-primary btn-sm" onClick={() => setSheet(m.id)}>Add</button></header>
                <ul>
                  <AnimatePresence initial={false}>
                    {rows.map((i) => (
                      <motion.li layout key={i.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-b border-border last:border-0 dark:border-darkmode-border">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
                          <div className="min-w-0 grow basis-48">
                            <p className="truncate font-semibold text-text-dark dark:text-darkmode-text-dark">{i.name}</p>
                            <p className="text-sm tabular-nums text-text-light dark:text-darkmode-text-light">{r0(i.kcal)} kcal · P {r0(i.protein)} · C {r0(i.carbs)} · F {r0(i.fat)}</p>
                          </div>
                          <div className="flex gap-1" role="group" aria-label={`Days for ${i.name}`}>
                            {DAYS.map((l, d) => <button key={d} aria-label={DAY_NAMES[d]} aria-pressed={!!(i.days & (1 << d))} onClick={() => void toggleDay(i, d)} className={`h-7 w-7 rounded-full text-xs font-bold transition-colors ${i.days & (1 << d) ? "bg-primary text-white dark:bg-darkmode-primary dark:text-text-dark" : "bg-light text-text-light dark:bg-darkmode-light"}`}>{l}</button>)}
                          </div>
                          {editId === i.id ? (
                            <form onSubmit={(ev) => { ev.preventDefault(); void saveGrams(i); }} className="flex items-center gap-1"><input autoFocus aria-label="Grams" inputMode="decimal" className="form-input !w-20 !px-2 !py-1.5 text-center" value={editVal} onChange={(ev) => setEditVal(ev.target.value)} onBlur={() => void saveGrams(i)} /><span className="text-sm">g</span></form>
                          ) : (
                            <button className="shrink-0 rounded-lg bg-light px-3 py-1.5 text-sm font-semibold tabular-nums dark:bg-darkmode-light" onClick={() => { setEditId(i.id); setEditVal(String(r1(i.grams))); }} aria-label={`${i.name}, ${r1(i.grams)} grams. Change amount`}>{r1(i.grams)} g</button>
                          )}
                          <button className="px-2 text-xl text-text-light hover:text-red-600" aria-label={`Take ${i.name} off my menu`} onClick={() => void remove(i)}>×</button>
                        </div>
                        {i.days !== ALL && <p className="-mt-1 px-5 pb-2 text-xs text-text-light dark:text-darkmode-text-light">Only on {DAY_NAMES.filter((_, d) => i.days & (1 << d)).map((n) => n.slice(0, 3)).join(", ")}</p>}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <AnimatePresence>{sheet && <AddFoodSheet key="menusheet" day={today} initialMeal={sheet} lang={lang} mode="menu" onClose={() => setSheet(null)} onAdded={(msg) => { say(msg); void load(); }} />}</AnimatePresence>
      <ToastBar toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

void pill;
