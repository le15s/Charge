"use client";

import { addFoodEntry, saveKitchen } from "@/app/actions/food";
import { addShopping } from "@/app/actions/shopping";
import { findIngredients, ING_BY_ID, nameOf, type Lang } from "@/lib/food-index";
import { cookSetup, type Mine } from "./Cookbook";
import CookMode, { type CookIngredient } from "./CookMode";
import { textToStep, toRecipe } from "@/lib/cooklang";
import { amount, DIETS, EQUIPMENT, findRecipes, tipFor, type Diet, type FinderQuery, type Kitchen, type Result, type Time } from "@/lib/recipes";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultMeal, localDay, MEALS, pill, r0, r1, Sheet, ToastBar, type Toast } from "./FoodBits";

const POPULAR = ["chicken-breast", "egg", "rice", "pasta", "onion", "tomato", "potato", "garlic", "carrot", "spinach", "chickpeas", "lentils", "tuna-canned", "yogurt", "ground-beef", "broccoli", "bell-pepper", "bread", "milk", "cheddar"];
const MEAL_FILTERS = [["any", "Any meal"], ["b", "Breakfast"], ["l", "Lunch"], ["d", "Dinner"], ["s", "Snack"]] as const;
const TIME_FILTERS: [Time, string, string][] = [["quick", "Quick", "30 min or less"], ["any", "Any", "No limit"], ["slow", "I have time", "an hour or more"]];
const STORE = "charge-pantry";

type Props = { goal: string; dayKcal: number; lang: Lang; kitchen: Kitchen; mine?: Mine[]; onShoppingChanged?: () => void; /** the diet picked at sign-up: starts the "Eating" filter until the person changes it */ profileDiet?: string | null };

/** Type what is in the kitchen, get recipes that fit the goal, answer two quick questions about spices, cook. */
export default function RecipeFinder({ goal, dayKcal, lang, kitchen: initialKitchen, mine = [], onShoppingChanged, profileDiet = null }: Props) {
  const [have, setHave] = useState<string[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [kitchen, setKitchen] = useState<Kitchen>(initialKitchen);
  const [meal, setMeal] = useState<(typeof MEAL_FILTERS)[number][0]>("any");
  const [time, setTime] = useState<Time>("any");
  const [diets, setDiets] = useState<Diet[]>([]);
  const [maxMissing, setMaxMissing] = useState<0 | 1 | 2>(1);
  const [showBlocked, setShowBlocked] = useState(false);
  const [kitchenOpen, setKitchenOpen] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(STORE) ?? "null"); if (s) { setHave((s.have ?? []).filter((i: string) => ING_BY_ID.has(i))); setUnknown(s.unknown ?? []); setDiets(s.diets ?? []); } else if (profileDiet === "veg") setDiets(["vegetarian"]); else if (profileDiet === "vegan") setDiets(["vegan"]); } catch { /* private mode */ }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) try { localStorage.setItem(STORE, JSON.stringify({ have, unknown, diets })); } catch { /* ignore */ } }, [hydrated, have, unknown, diets]);

  const saveSoon = (k: Kitchen) => { if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => void saveKitchen({ equipment: k.equipment, haveSpices: k.haveSpices, noSpices: k.noSpices }), 500); };
  const updateKitchen = (k: Kitchen) => { setKitchen(k); saveSoon(k); };
  const toggleEquip = (id: string) => updateKitchen({ ...kitchen, equipment: kitchen.equipment.includes(id) ? kitchen.equipment.filter((e) => e !== id) : [...kitchen.equipment, id] });
  const answer = (id: string, yes: boolean) => updateKitchen({ ...kitchen, haveSpices: yes ? [...new Set([...kitchen.haveSpices, id])] : kitchen.haveSpices.filter((s) => s !== id), noSpices: yes ? kitchen.noSpices.filter((s) => s !== id) : [...new Set([...kitchen.noSpices, id])] });
  const forget = (id: string) => updateKitchen({ ...kitchen, haveSpices: kitchen.haveSpices.filter((s) => s !== id), noSpices: kitchen.noSpices.filter((s) => s !== id) });

  const suggestions = useMemo(() => (text.trim().length >= 2 ? findIngredients(text, 7).filter((i) => !have.includes(i.id)) : []), [text, have]);
  const addId = (id: string) => { setHave((h) => (h.includes(id) ? h : [...h, id])); setText(""); };
  function commit() {
    const parts = text.split(/[,;\n،]| and | et | y | und | e | ve /i).map((s) => s.trim()).filter((s) => s.length >= 2);
    if (!parts.length) return;
    const ids: string[] = [], miss: string[] = [];
    for (const p of parts) { const f = findIngredients(p, 1)[0]; if (f) ids.push(f.id); else miss.push(p); }
    setHave((h) => [...new Set([...h, ...ids])]);
    setUnknown((u) => [...new Set([...u, ...miss])]);
    setText("");
  }

  const query: FinderQuery = { have, kitchen, diets, time, meal, maxMissing, goal, dayKcal, showBlocked };
  const extra = useMemo(() => mine.map(toRecipe), [mine]);
  const { results, blocked } = useMemo(() => findRecipes(query, lang, extra), [extra, have, kitchen, diets, time, meal, maxMissing, goal, dayKcal, showBlocked, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const blockedTools = useMemo(() => [...new Set(blocked.flatMap((b) => b.blockedBy))], [blocked]);
  const openResult = open ? [...results, ...blocked].find((r) => r.recipe.id === open) ?? null : null;
  const goalText = ({ lose: "losing weight: lighter and higher in protein first", recomp: "body recomposition: high protein, moderate calories first", muscle: "building muscle: high protein and enough calories first", strength: "strength: high protein and enough calories first" } as Record<string, string>)[goal] ?? "staying where you are: balanced, right-sized meals first";

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="gingham h-3" aria-hidden />
        <div className="space-y-4 p-5">
          <div>
            <h2 className="h4">What do you have?</h2>
            <p className="mt-1 text-sm">Type ingredients in any of our 8 languages, one at a time or a whole list separated by commas. We assume you have salt, pepper, water and cooking oil.</p>
          </div>
          <div className="relative">
            <label htmlFor="ing" className="sr-only">Add an ingredient</label>
            <div className="flex gap-2">
              <input id="ing" className="form-input" placeholder="chicken, riz, tomate, بصل, patata…" value={text} autoComplete="off" onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (text.includes(",") || !suggestions.length) commit(); else addId(suggestions[0].id); } }} />
              <button className="btn btn-primary" onClick={() => (suggestions.length && !text.includes(",") ? addId(suggestions[0].id) : commit())} disabled={text.trim().length < 2}>Add</button>
            </div>
            {suggestions.length > 0 && !text.includes(",") && (
              <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg dark:border-darkmode-border dark:bg-darkmode-card" role="listbox" aria-label="Matches">
                {suggestions.map((i) => <li key={i.id}><button role="option" aria-selected={false} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-light dark:hover:bg-darkmode-light" onClick={() => addId(i.id)}><span className="font-semibold text-text-dark dark:text-darkmode-text-dark">{nameOf(i, lang)}</span>{lang !== "en" && <span className="text-xs text-text-light">{i.names.en[0]}</span>}</button></li>)}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Your ingredients">
            {have.map((id) => { const i = ING_BY_ID.get(id)!; return <button key={id} className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20 dark:bg-darkmode-primary/15 dark:text-darkmode-primary" onClick={() => setHave((h) => h.filter((x) => x !== id))} aria-label={`Remove ${nameOf(i, lang)}`}>{nameOf(i, lang)} <span aria-hidden>×</span></button>; })}
            {unknown.map((u) => <button key={u} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-text-light" title="We don't know this one yet, so it can't be matched. Your recipes still work with the rest." onClick={() => setUnknown((x) => x.filter((y) => y !== u))}>{u} <span aria-hidden>×</span></button>)}
            {(have.length > 0 || unknown.length > 0) && <button className="px-2 text-sm font-semibold text-text-light underline" onClick={() => { setHave([]); setUnknown([]); }}>Clear all</button>}
          </div>
          {unknown.length > 0 && <p className="text-xs text-text-light dark:text-darkmode-text-light">Dashed ones are new to us. We can&apos;t match them yet, but recipes still work with everything else you gave.</p>}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-text-light">Tap to add</p>
            <div className="flex flex-wrap gap-1.5">{POPULAR.filter((id) => !have.includes(id)).map((id) => <button key={id} className="rounded-full border border-border px-3 py-1 text-sm font-semibold hover:border-primary hover:text-primary dark:border-darkmode-border dark:hover:border-darkmode-primary" onClick={() => addId(id)}>+ {nameOf(ING_BY_ID.get(id)!, lang)}</button>)}</div>
          </div>
        </div>
      </section>

      <section className="card space-y-5 p-5" aria-label="Filters">
        <div className="grid gap-5 md:grid-cols-2">
          <div><span className="form-label">Meal</span><div className="flex flex-wrap gap-2">{MEAL_FILTERS.map(([id, l]) => <button key={id} aria-pressed={meal === id} className={pill(meal === id)} onClick={() => setMeal(id)}>{l}</button>)}</div></div>
          <div><span className="form-label">How much time?</span><div className="flex flex-wrap gap-2">{TIME_FILTERS.map(([id, l, d]) => <button key={id} aria-pressed={time === id} title={d} className={pill(time === id)} onClick={() => setTime(id)}>{l} <span className="hidden text-xs font-medium opacity-75 sm:inline">· {d}</span></button>)}</div></div>
        </div>
        <div><span className="form-label">Eating</span><div className="flex flex-wrap gap-2">{DIETS.map((d) => <button key={d.id} aria-pressed={diets.includes(d.id)} className={pill(diets.includes(d.id))} onClick={() => setDiets((c) => (c.includes(d.id) ? c.filter((x) => x !== d.id) : [...c, d.id]))}>{d.label}</button>)}</div></div>
        <div className="grid gap-5 md:grid-cols-2">
          <div><span className="form-label">Missing ingredients</span><div className="flex flex-wrap gap-2">{([[0, "Only what I have"], [1, "Up to 1 missing"], [2, "Up to 2 missing"]] as const).map(([n, l]) => <button key={n} aria-pressed={maxMissing === n} className={pill(maxMissing === n)} onClick={() => setMaxMissing(n)}>{l}</button>)}</div></div>
          <div>
            <span className="form-label">My kitchen</span>
            <button className={pill(kitchenOpen)} aria-expanded={kitchenOpen} onClick={() => setKitchenOpen((v) => !v)}>{kitchen.equipment.length} tool{kitchen.equipment.length === 1 ? "" : "s"} · {kitchenOpen ? "hide" : "change"}</button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {kitchenOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="rounded-xl bg-light p-4 dark:bg-darkmode-light">
                <p className="mb-3 text-sm">Tick what you can cook with. Recipes that need something you don&apos;t have are hidden. We remember this for next time.</p>
                <div className="grid gap-2 sm:grid-cols-3">{EQUIPMENT.map((e) => { const on = kitchen.equipment.includes(e.id); return <label key={e.id} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-colors ${on ? "border-primary bg-card dark:border-darkmode-primary dark:bg-darkmode-card" : "border-transparent bg-card/60 dark:bg-darkmode-card/50"}`}><input type="checkbox" checked={on} onChange={() => toggleEquip(e.id)} />{e.label}</label>; })}</div>
                {(kitchen.haveSpices.length > 0 || kitchen.noSpices.length > 0) && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold">Spices and sauces you told us about</p>
                    <div className="flex flex-wrap gap-1.5">
                      {kitchen.haveSpices.map((s) => <button key={s} className="rounded-full bg-card px-2.5 py-1 text-xs font-semibold dark:bg-darkmode-card" onClick={() => forget(s)} title="Tap to forget">✓ {ING_BY_ID.get(s) ? nameOf(ING_BY_ID.get(s)!, lang) : s}</button>)}
                      {kitchen.noSpices.map((s) => <button key={s} className="rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-text-light line-through dark:bg-darkmode-card" onClick={() => forget(s)} title="Tap to forget">{ING_BY_ID.get(s) ? nameOf(ING_BY_ID.get(s)!, lang) : s}</button>)}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="h4">{have.length === 0 ? "Recipes" : `${results.length} recipe${results.length === 1 ? "" : "s"} you can make`}</h2>
        <p className="text-sm text-text-light dark:text-darkmode-text-light">Ordered for {goalText}.</p>
      </div>

      {have.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center dark:border-darkmode-border">
          <p className="font-secondary text-2xl font-black text-text-dark dark:text-darkmode-text-dark">Start with two or three things</p>
          <p className="mx-auto mt-1 max-w-md text-sm">Add what&apos;s in your fridge or cupboard above. You don&apos;t need to list everything. We&apos;ll ask about spices when you open a recipe.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center dark:border-darkmode-border">
          <p className="font-secondary text-2xl font-black text-text-dark dark:text-darkmode-text-dark">Nothing fits yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm">Add a couple more ingredients, allow one missing, relax the time, or loosen the filters.</p>
          {maxMissing < 2 && <button className="btn btn-outline-primary btn-sm mt-4" onClick={() => setMaxMissing(2)}>Allow up to 2 missing</button>}
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {results.map((r, i) => <RecipeCard key={r.recipe.id} r={r} index={i} onOpen={() => setOpen(r.recipe.id)} />)}
        </ul>
      )}

      {!showBlocked && blocked.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-light px-5 py-4 dark:bg-darkmode-light">
          <p className="text-sm"><b className="text-text-dark dark:text-darkmode-text-dark">{blocked.length} more recipe{blocked.length === 1 ? " is" : "s are"} hidden</b> because you need: {blockedTools.join(", ")}.</p>
          <button className="btn btn-outline-primary btn-sm" onClick={() => setShowBlocked(true)}>Show them anyway</button>
        </div>
      )}

      <AnimatePresence>{openResult && <RecipeSheet key="rs" r={openResult} mine={mine} query={query} lang={lang} kitchen={kitchen} onAnswer={answer} onClose={() => setOpen(null)} onLogged={(t) => setToast({ text: t, id: Date.now() })} onShopping={(t) => { setToast({ text: t, id: Date.now() }); onShoppingChanged?.(); }} />}</AnimatePresence>
      <ToastBar toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function RecipeCard({ r, index, onOpen }: { r: Result; index: number; onOpen: () => void }) {
  const need = r.asks.filter((a) => a.answer === null && a.essential).length;
  return (
    <motion.li initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.04, type: "spring", stiffness: 260, damping: 26 }}>
      <button onClick={onOpen} className="recipe-card group h-full w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-light dark:text-darkmode-text-light">{r.recipe.cuisine} · {r.recipe.time} min</p>
            <h3 className="h5 mt-0.5">{r.recipe.name}</h3>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${r.status === "ready" ? "bg-primary/15 text-primary dark:bg-darkmode-primary/20 dark:text-darkmode-primary" : "bg-yellow-400/25 text-yellow-800 dark:text-yellow-300"}`}>{r.status === "ready" ? "You have it all" : `Missing ${r.missing.length}`}</span>
        </div>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 tabular-nums"><span className="font-secondary text-3xl font-extrabold text-text-dark dark:text-darkmode-text-dark">{r0(r.per.kcal)}<span className="ml-1 text-sm font-bold text-text-light">kcal</span></span><span className="text-sm font-semibold"><b className="text-plate-blue dark:text-darkmode-plate-blue">{r0(r.per.protein)} g</b> protein</span><span className="text-sm">C {r0(r.per.carbs)} · F {r0(r.per.fat)}</span></p>
        <p className="mt-1 text-xs text-text-light dark:text-darkmode-text-light">per serving, makes {r.recipe.servings}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.why.map((w) => <span key={w} className="rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-bold text-primary dark:bg-darkmode-primary/15 dark:text-darkmode-primary">{w}</span>)}
          {r.missing.length > 0 && <span className="rounded-full bg-light px-2.5 py-0.5 text-xs font-semibold dark:bg-darkmode-light">Need: {r.missing.join(", ")}</span>}
          {need > 0 && <span className="rounded-full bg-light px-2.5 py-0.5 text-xs font-semibold dark:bg-darkmode-light">{need} quick question{need > 1 ? "s" : ""}</span>}
          {r.blockedBy.length > 0 && <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">Needs {r.blockedBy.join(", ")}</span>}
        </div>
      </button>
    </motion.li>
  );
}

function RecipeSheet({ r, mine, query, lang, kitchen, onAnswer, onClose, onLogged, onShopping }: { r: Result; mine: Mine[]; query: FinderQuery; lang: Lang; kitchen: Kitchen; onAnswer: (id: string, yes: boolean) => void; onClose: () => void; onLogged: (text: string) => void; onShopping: (text: string) => void }) {
  const [servings, setServings] = useState(r.recipe.servings);
  const [meal, setMeal] = useState(defaultMeal());
  const [busy, setBusy] = useState(false);
  const [cooking, setCooking] = useState(false);
  const scale = servings / r.recipe.servings;
  const asks = r.lines.filter((l) => l.state === "ask" || l.state === "ask-no" || l.state === "ask-yes");
  const mustAsk = [...asks].sort((a, b) => Number(b.essential) - Number(a.essential));
  const needAnswer = asks.filter((l) => l.state === "ask");
  void kitchen; void query; void lang;

  async function log() {
    setBusy(true);
    const g = Math.max(1, r.per.grams);
    const per100 = { kcal: Math.min(900, (r.per.kcal / g) * 100), protein: Math.min(100, (r.per.protein / g) * 100), carbs: Math.min(100, (r.per.carbs / g) * 100), fat: Math.min(100, (r.per.fat / g) * 100) };
    const res = await addFoodEntry({ day: localDay(), meal, name: `${r.recipe.name} (1 serving)`, grams: Math.round(g), per100 });
    setBusy(false);
    if (res.ok) { onLogged(`${r.recipe.name} logged to ${MEALS.find((m) => m.id === meal)?.label.toLowerCase()}`); onClose(); }
  }

  /** Put what is missing (or everything) on the shopping list, scaled to the servings chosen. */
  async function toList(all: boolean) {
    const pick = r.lines.filter((l) => (all ? ["have", "missing", "ask", "ask-yes", "optional-have"].includes(l.state) : l.state === "missing" || (l.state === "ask-no" && l.essential)));
    const items = pick.map((l) => { const ing = ING_BY_ID.get(l.id); return { ingredientId: ing ? l.id : null, name: ing ? ing.names.en[0] : l.name, grams: Math.round(l.grams * scale), note: `for ${r.recipe.name}` }; });
    if (!items.length) return;
    const res = await addShopping(items);
    onShopping(res.ok ? `${items.length} item${items.length > 1 ? "s" : ""} on your shopping list` : "Couldn't add");
  }

  const own = r.recipe.mine ? mine.find((m) => `mine:${m.id}` === r.recipe.id) : undefined;
  const cook: { steps: ReturnType<typeof textToStep>[]; ingredients: CookIngredient[] } = own
    ? cookSetup(own)
    : { steps: r.recipe.steps.map(textToStep), ingredients: r.lines.filter((l) => !l.state.endsWith("-no") && l.state !== "ask-no").map((l) => ({ name: l.name, text: (sc: number) => amount(ING_BY_ID.get(l.id), l.grams, sc) })) };

  const stateIcon: Record<string, { i: string; c: string; t: string }> = {
    have: { i: "✓", c: "text-primary dark:text-darkmode-primary", t: "You have it" },
    missing: { i: "✗", c: "text-red-600 dark:text-red-400", t: "Missing" },
    staple: { i: "○", c: "text-text-light", t: "Pantry basic" },
    "optional-have": { i: "✓", c: "text-primary dark:text-darkmode-primary", t: "Optional, you have it" },
    "optional-no": { i: "–", c: "text-text-light", t: "Optional" },
    ask: { i: "?", c: "text-yellow-700 dark:text-yellow-300", t: "Do you have this?" },
    "ask-yes": { i: "✓", c: "text-primary dark:text-darkmode-primary", t: "You said yes" },
    "ask-no": { i: "–", c: "text-text-light", t: "You said no" },
  };

  return (
    <Sheet label={r.recipe.name} title={r.recipe.name} onClose={onClose} wide>
      <div className="space-y-6 overflow-y-auto p-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="font-semibold">{r.recipe.cuisine}</span><span>{r.recipe.time} min of your time</span>
          {r.recipe.equipment.length > 0 && <span>Needs: {r.recipe.equipment.map((g) => g.map((e) => EQUIPMENT.find((x) => x.id === e)?.label ?? e).join(" or ")).join(" + ")}</span>}
        </div>

        <div className="grid grid-cols-4 gap-2 rounded-xl bg-light p-4 text-center dark:bg-darkmode-light">
          {[["Calories", r0(r.per.kcal)], ["Protein", `${r1(r.per.protein)} g`], ["Carbs", `${r1(r.per.carbs)} g`], ["Fat", `${r1(r.per.fat)} g`]].map(([k, v]) => <div key={k}><p className="text-xs">{k}</p><p className="font-secondary text-2xl font-black tabular-nums text-text-dark dark:text-darkmode-text-dark">{v}</p></div>)}
          <p className="col-span-4 text-xs text-text-light dark:text-darkmode-text-light">per serving, from the ingredients you have</p>
        </div>

        {mustAsk.length > 0 && (
          <section aria-label="Quick check" className="rounded-2xl border-2 border-primary/40 p-4 dark:border-darkmode-primary/40">
            <h3 className="h5">Quick check{needAnswer.length ? "" : " ✓"}</h3>
            <p className="mb-3 text-sm">{needAnswer.length ? "Do you have these? We remember your answers, and the recipe adapts." : "Your answers are saved. Tap one to change it."}</p>
            <ul className="space-y-2.5">
              {mustAsk.map((l) => (
                <li key={l.id} className="rounded-xl bg-light p-3 dark:bg-darkmode-light">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-text-dark dark:text-darkmode-text-dark">{l.name}{l.essential ? "" : <span className="ml-1.5 text-xs font-medium text-text-light">(optional flavour)</span>}</span>
                    <span className="flex gap-1.5"><button className={pill(l.state === "ask-yes")} onClick={() => onAnswer(l.id, true)}>Yes</button><button className={pill(l.state === "ask-no")} onClick={() => onAnswer(l.id, false)}>No</button></span>
                  </div>
                  {l.state === "ask-no" && <p className="mt-1.5 text-sm text-text-light dark:text-darkmode-text-light">{l.essential ? "This dish leans on it. " : ""}{tipFor(l.id)}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Ingredients">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="h5">Ingredients</h3>
            <div className="flex items-center gap-2 text-sm font-semibold"><span>Servings</span><button className="h-8 w-8 rounded-full bg-light text-lg dark:bg-darkmode-light" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Fewer servings">−</button><span className="w-5 text-center tabular-nums">{servings}</span><button className="h-8 w-8 rounded-full bg-light text-lg dark:bg-darkmode-light" onClick={() => setServings((s) => Math.min(12, s + 1))} aria-label="More servings">+</button></div>
          </div>
          <ul className="divide-y divide-border dark:divide-darkmode-border">
            {r.lines.map((l, i) => {
              const ic = stateIcon[l.state];
              return (
                <li key={l.id + i} className="flex items-baseline gap-3 py-2">
                  <span className={`w-4 shrink-0 text-center font-bold ${ic.c}`} title={ic.t} aria-label={ic.t}>{ic.i}</span>
                  <span className={`grow ${l.state === "ask-no" || l.state === "optional-no" ? "text-text-light line-through decoration-1" : "text-text-dark dark:text-darkmode-text-dark"}`}>{l.name}{l.state.startsWith("optional") ? " (optional)" : ""}{l.state === "missing" ? <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-300">missing</span> : null}</span>
                  <span className="shrink-0 tabular-nums text-text-light dark:text-darkmode-text-light">{amount(ING_BY_ID.get(l.id), l.grams, scale)}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-label="Method">
          <h3 className="h5 mb-3">Method</h3>
          <ol className="space-y-3">{r.recipe.steps.map((s, i) => <li key={i} className="flex gap-3"><span className="course-no shrink-0" aria-hidden>{i + 1}.</span><p>{s}</p></li>)}</ol>
        </section>

        <button className="btn btn-primary w-full" onClick={() => setCooking(true)}>Start cook mode</button>
        <AnimatePresence>{cooking && <CookMode key="cook" name={r.recipe.name} baseServings={r.recipe.servings} startServings={servings} steps={cook.steps} ingredients={cook.ingredients} onClose={() => setCooking(false)} />}</AnimatePresence>

        <div className="flex flex-wrap gap-2" aria-label="Shopping">
          {r.missing.length > 0 && <button className="btn btn-outline-primary btn-sm" onClick={() => void toList(false)}>Add missing to my list ({r.missing.length})</button>}
          <button className="btn btn-outline-primary btn-sm" onClick={() => void toList(true)}>Add all ingredients to my list</button>
        </div>

        <section className="space-y-3 rounded-2xl bg-light p-4 dark:bg-darkmode-light" aria-label="Log it">
          <p className="font-semibold text-text-dark dark:text-darkmode-text-dark">Ate it? Log one serving ({r0(r.per.kcal)} kcal).</p>
          <div className="flex flex-wrap gap-2">{MEALS.map((x) => <button key={x.id} aria-pressed={meal === x.id} onClick={() => setMeal(x.id)} className={pill(meal === x.id)}>{x.label}</button>)}</div>
          <button className="btn btn-primary w-full" disabled={busy} onClick={() => void log()}>{busy ? "Logging…" : "Log 1 serving to today"}</button>
        </section>
      </div>
    </Sheet>
  );
}
