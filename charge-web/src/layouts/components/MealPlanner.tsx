"use client";

import { addFoodEntry } from "@/app/actions/food";
import { addPlanItem, clearPlan, getPlan, removePlanItem, setPlanServings, type PlanItem } from "@/app/actions/mealplan";
import { addShopping } from "@/app/actions/shopping";
import { parseCook, toRecipe } from "@/lib/cooklang";
import { ING_BY_ID } from "@/lib/food-index";
import { isStaple, RECIPE_BY_ID, RECIPES, recipePer, type Kitchen, type Recipe } from "@/lib/recipes";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cookSetup, textToStep, type Mine } from "./Cookbook";
import CookMode from "./CookMode";
import { amount } from "@/lib/recipes";
import { localDay, pill, Sheet, ToastBar, type Toast } from "./FoodBits";

const MEALS = [["b", "Breakfast", "breakfast"], ["l", "Lunch", "lunch"], ["d", "Dinner", "dinner"], ["s", "Snacks", "snack"]] as const;
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const mondayOf = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** Plan the week: pick recipes for each meal, see the calories add up, send everything you need to the shopping list. */
export default function MealPlanner({ mine, kitchen, dayKcal, onShopping }: { mine: Mine[]; kitchen: Kitchen; dayKcal: number; onShopping?: () => void }) {
  const [monday, setMonday] = useState(() => mondayOf(new Date()));
  const [items, setItems] = useState<PlanItem[] | null>(null);
  const [adding, setAdding] = useState<null | { day: string; meal: (typeof MEALS)[number][0] }>(null);
  const [cooking, setCooking] = useState<null | { rec: Recipe; servings: number }>(null);
  const [skipHave, setSkipHave] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const say = (text: string, undo?: () => void) => setToast({ id: Date.now(), text, undo });

  const from = iso(monday), to = iso(addDays(monday, 6));
  useEffect(() => { let live = true; setItems(null); void getPlan(from, to).then((r) => live && setItems(r)); return () => { live = false; }; }, [from, to]);

  const mineRecipes = useMemo(() => mine.map(toRecipe), [mine]);
  const byId = useCallback((id: string): Recipe | undefined => RECIPE_BY_ID.get(id) ?? mineRecipes.find((r) => r.id === id), [mineRecipes]);
  const today = iso(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const label = `${monday.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${addDays(monday, 6).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;

  async function add(day: string, meal: (typeof MEALS)[number][0], rec: Recipe) {
    const r = await addPlanItem({ day, meal, recipeId: rec.id, servings: 1 });
    if (r.ok) setItems((c) => [...(c ?? []), r.item]);
    setAdding(null);
  }
  const remove = (it: PlanItem) => { setItems((c) => (c ?? []).filter((x) => x.id !== it.id)); void removePlanItem(it.id); };
  const bump = (it: PlanItem, d: number) => { const s = Math.min(24, Math.max(1, it.servings + d)); setItems((c) => (c ?? []).map((x) => (x.id === it.id ? { ...x, servings: s } : x))); void setPlanServings(it.id, s); };
  async function logIt(it: PlanItem, rec: Recipe) {
    const per = recipePer(rec); const g = Math.max(1, per.grams) * it.servings;
    const k = it.servings; const meal = MEALS.find((m) => m[0] === it.meal)![2];
    const f = (n: number) => Math.min(900, ((n * k) / g) * 100);
    const r = await addFoodEntry({ day: localDay(), meal, name: `${rec.name} (${k} serving${k > 1 ? "s" : ""})`, grams: Math.round(g), per100: { kcal: f(per.kcal), protein: Math.min(100, f(per.protein)), carbs: Math.min(100, f(per.carbs)), fat: Math.min(100, f(per.fat)) } });
    say(r.ok ? `${rec.name} logged to today` : "Couldn't log that");
  }

  /** Everything the planned recipes need, added up, minus pantry basics and what you already have. */
  function shoppingItems() {
    let haveIds = new Set<string>();
    if (skipHave) { try { const s = JSON.parse(localStorage.getItem("charge-pantry") ?? "null"); haveIds = new Set<string>([...(s?.have ?? []), ...kitchen.haveSpices]); } catch { haveIds = new Set(kitchen.haveSpices); } }
    const sum = new Map<string, { ingredientId: string | null; name: string; grams: number; recipes: Set<string> }>();
    for (const it of items ?? []) {
      const rec = byId(it.recipeId); if (!rec) continue; const scale = it.servings / rec.servings;
      const lines: { id: string | null; name: string; grams: number }[] = rec.mine
        ? (() => { const own = mine.find((m) => `mine:${m.id}` === rec.id); return own ? toLines(own) : []; })()
        : rec.slots.filter((s) => !s.optional).map((s) => ({ id: s.alts[0], name: ING_BY_ID.get(s.alts[0])?.names.en[0] ?? s.alts[0], grams: s.grams }));
      for (const l of lines) {
        if (l.id && (isStaple(l.id) || haveIds.has(l.id))) continue;
        const key = l.id ?? l.name.toLowerCase();
        const e = sum.get(key) ?? { ingredientId: l.id, name: l.name, grams: 0, recipes: new Set<string>() };
        e.grams += l.grams * scale; e.recipes.add(rec.name); sum.set(key, e);
      }
    }
    return [...sum.values()].map((e) => ({ ingredientId: e.ingredientId, name: e.name, grams: Math.round(e.grams), note: "meal plan" }));
  }
  async function toList() {
    const list = shoppingItems();
    if (!list.length) return say("Nothing to add. You already have it all, or the week is empty.");
    const r = await addShopping(list);
    say(r.ok ? `${list.length} item${list.length > 1 ? "s" : ""} added to your shopping list` : "Couldn't add"); if (r.ok) onShopping?.();
  }

  const weekKcal = (d: string) => (items ?? []).filter((x) => x.day === d).reduce((a, x) => { const r = byId(x.recipeId); return a + (r ? recipePer(r).kcal * x.servings : 0); }, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button className="soft-btn !px-3" aria-label="Previous week" onClick={() => setMonday(addDays(monday, -7))}>‹</button>
        <h2 className="h5 !mb-0 min-w-44 text-center" data-testid="week-label">{label}</h2>
        <button className="soft-btn !px-3" aria-label="Next week" onClick={() => setMonday(addDays(monday, 7))}>›</button>
        <button className="soft-btn !px-3 text-sm" onClick={() => setMonday(mondayOf(new Date()))}>This week</button>
        <span className="grow" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={skipHave} onChange={(e) => setSkipHave(e.target.checked)} className="h-4 w-4 accent-[color:var(--sk-accent)]" />Skip what I already have</label>
        <button className="btn btn-primary btn-sm" disabled={!items?.length} onClick={() => void toList()}>Add this week to my shopping list</button>
      </div>

      {items === null ? <p className="py-10 text-center opacity-70" role="status">Loading your week…</p> : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Week plan">
          {days.map((d) => {
            const ds = iso(d); const kcal = Math.round(weekKcal(ds));
            return (
              <li key={ds} className={`card p-4 ${ds === today ? "ring-2 ring-[color:var(--sk-accent)]" : ""}`} data-testid={`day-${ds}`}>
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h3 className="font-secondary text-lg font-bold">{d.toLocaleDateString(undefined, { weekday: "long" })} <span className="text-sm font-normal opacity-60">{d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span></h3>
                  {kcal > 0 && <span className={`text-xs font-bold tabular-nums ${dayKcal && kcal > dayKcal * 1.1 ? "text-red-600 dark:text-red-400" : "text-[color:var(--sk-accent-text)]"}`} data-testid="day-kcal">{kcal}{dayKcal ? ` / ${dayKcal}` : ""} kcal</span>}
                </div>
                <div className="space-y-3">
                  {MEALS.map(([m, ml]) => {
                    const its = items.filter((x) => x.day === ds && x.meal === m);
                    return (
                      <div key={m}>
                        <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide opacity-60">{ml}</p><button className="text-sm font-semibold text-[color:var(--sk-accent-text)] underline decoration-2 underline-offset-4" aria-label={`Add to ${ml} on ${d.toLocaleDateString(undefined, { weekday: "long" })}`} onClick={() => setAdding({ day: ds, meal: m })}>+ Add</button></div>
                        {its.map((it) => {
                          const rec = byId(it.recipeId);
                          return (
                            <div key={it.id} className="mt-1 rounded-xl bg-[color:var(--sk-light)] px-3 py-2 text-sm" data-testid="plan-item">
                              <p className="font-semibold">{rec?.name ?? "Recipe was deleted"}{rec?.mine && <span className="ml-1.5 rounded-full bg-[color:var(--sk-card)] px-1.5 text-[10px] font-bold uppercase">mine</span>}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="flex items-center gap-1"><button className="h-6 w-6 rounded-full bg-[color:var(--sk-card)]" aria-label={`Fewer servings of ${rec?.name}`} onClick={() => bump(it, -1)}>−</button><span className="min-w-12 text-center tabular-nums">{it.servings} {it.servings === 1 ? "serving" : "servings"}</span><button className="h-6 w-6 rounded-full bg-[color:var(--sk-card)]" aria-label={`More servings of ${rec?.name}`} onClick={() => bump(it, 1)}>+</button></span>
                                {rec && <span className="tabular-nums opacity-70">{recipePer(rec).kcal * it.servings} kcal</span>}
                                <span className="grow" />
                                {rec && <button className="font-semibold underline underline-offset-4" onClick={() => setCooking({ rec, servings: it.servings })}>Cook</button>}
                                {rec && ds === today && <button className="font-semibold underline underline-offset-4" onClick={() => void logIt(it, rec)}>Log</button>}
                                <button className="text-red-600 dark:text-red-400" aria-label={`Remove ${rec?.name ?? "recipe"}`} onClick={() => remove(it)}>✕</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!!items?.length && <button className="text-sm text-red-600 underline dark:text-red-400" onClick={() => { if (confirm("Clear every meal this week?")) { setItems([]); void clearPlan(from, to); } }}>Clear this week</button>}

      <AnimatePresence>
        {adding && <Picker key="pick" meal={adding.meal} mine={mineRecipes} onClose={() => setAdding(null)} onPick={(r) => void add(adding.day, adding.meal, r)} />}
        {cooking && <CookModeFor key="cook" rec={cooking.rec} servings={cooking.servings} mine={mine} onClose={() => setCooking(null)} />}
      </AnimatePresence>
      <ToastBar toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

/** Ingredient lines (with grams) of a recipe you wrote, for the shopping list. */
function toLines(m: Mine) {
  return parseCook(m.text).ingredients.filter((l) => !l.optional).map((l) => ({ id: l.id, name: l.id ? ING_BY_ID.get(l.id)!.names.en[0] : l.name, grams: l.grams ?? 0 }));
}

function CookModeFor({ rec, servings, mine, onClose }: { rec: Recipe; servings: number; mine: Mine[]; onClose: () => void }) {
  const own = rec.mine ? mine.find((m) => `mine:${m.id}` === rec.id) : undefined;
  const setup = own ? cookSetup(own) : { steps: rec.steps.map(textToStep), ingredients: rec.slots.map((s) => ({ name: ING_BY_ID.get(s.alts[0])?.names.en[0] ?? s.alts[0], text: (sc: number) => amount(ING_BY_ID.get(s.alts[0]), s.grams, sc) })) };
  return <CookMode name={rec.name} baseServings={rec.servings} startServings={servings} {...setup} onClose={onClose} />;
}

function Picker({ meal, mine, onClose, onPick }: { meal: string; mine: Recipe[]; onClose: () => void; onPick: (r: Recipe) => void }) {
  const [q, setQ] = useState(""); const [all, setAll] = useState(false);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...mine, ...RECIPES].filter((r) => (all || r.meals.includes(meal)) && (!t || r.name.toLowerCase().includes(t) || r.cuisine.toLowerCase().includes(t) || r.slots.some((s) => s.alts.some((a) => a.includes(t.replace(/\s+/g, "-"))))))
      .slice(0, 60).map((r) => ({ r, per: recipePer(r) }));
  }, [q, all, meal, mine]);
  return (
    <Sheet label="Pick a recipe" title={`Pick a ${MEALS.find((m) => m[0] === meal)![1].toLowerCase().replace(/s$/, "")} recipe`} onClose={onClose} wide>
      <div className="flex min-h-0 grow flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--sk-line)] p-3">
          <input autoFocus aria-label="Search recipes" className="form-input grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, cuisine or ingredient…" />
          <button className={pill(all)} aria-pressed={all} onClick={() => setAll((v) => !v)}>All meals</button>
        </div>
        <ul className="min-h-0 grow divide-y divide-[color:var(--sk-line)] overflow-y-auto" aria-label="Recipes">
          {list.map(({ r, per }) => (
            <li key={r.id}><button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[color:var(--sk-light)]" onClick={() => onPick(r)}>
              <span className="min-w-0 grow"><span className="block truncate font-semibold">{r.name}{r.mine && <span className="ml-1.5 rounded-full bg-[color:var(--sk-light)] px-1.5 text-[10px] font-bold uppercase">mine</span>}</span><span className="text-xs opacity-70">{r.cuisine} · {r.time} min</span></span>
              <span className="shrink-0 text-sm tabular-nums"><b>{per.kcal}</b> kcal · P {per.protein} g</span>
            </button></li>
          ))}
          {list.length === 0 && <li className="p-6 text-center opacity-70">Nothing matches. Try &quot;All meals&quot; or another word.</li>}
        </ul>
      </div>
    </Sheet>
  );
}
