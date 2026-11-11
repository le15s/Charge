"use client";

import { deleteMyRecipe, importRecipe, saveMyRecipe } from "@/app/actions/recipes";
import { addShopping } from "@/app/actions/shopping";
import { findIngredients, ING_BY_ID } from "@/lib/food-index";
import { fmtTimer, nutritionOf, parseCook, qtyText, textToStep, type MyRecipe, type Parsed } from "@/lib/cooklang";
import { AnimatePresence } from "motion/react";
import { useMemo, useRef, useState } from "react";
import CookMode from "./CookMode";
import type { Draft } from "@/lib/recipe-import";
import { pill, Sheet, ToastBar, type Toast } from "./FoodBits";

export type Mine = MyRecipe & { sourceUrl?: string | null };
const MEAL_OPTS = [["b", "Breakfast"], ["l", "Lunch"], ["d", "Dinner"], ["s", "Snack"]] as const;
const STARTER = `Heat @olive oil{1%tbsp} in a #large pan{}. Fry @onion{1}, chopped, for ~{5%minutes}.

Add @chicken breast{300%g}, cut into pieces, with @paprika{1%tsp} and cook for ~{8%minutes}, turning now and then.

Stir in @rice{150%g}, cooked, and @peas{80%g}. Warm through, season, and serve.`;

/** What goes in a step for cook mode: the parsed tokens. Ingredient lines for the "all ingredients" list. */
export const cookSetup = (m: MyRecipe) => {
  const p = parseCook(m.text);
  return { steps: p.steps, ingredients: p.ingredients.map((l) => ({ name: l.name, text: (scale: number) => qtyText(l.qty, l.unit, scale) || "to taste" })) };
};
export { textToStep };

export default function Cookbook({ mine, onChange, onShopping }: { mine: Mine[]; onChange: (list: Mine[]) => void; onShopping?: () => void }) {
  const [editing, setEditing] = useState<Mine | "new" | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [importing, setImporting] = useState(false);
  const [cooking, setCooking] = useState<Mine | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const say = (text: string) => setToast({ id: Date.now(), text });

  async function toList(m: Mine) {
    const p = parseCook(m.text);
    const items = p.ingredients.filter((l) => !l.optional).map((l) => ({ ingredientId: l.id, name: l.id ? ING_BY_ID.get(l.id)!.names.en[0] : l.name, grams: Math.round(l.grams ?? 0), note: `for ${m.name}` }));
    if (!items.length) return;
    const r = await addShopping(items);
    if (r.ok) { say(`${items.length} item${items.length > 1 ? "s" : ""} on your shopping list`); onShopping?.(); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-text-light dark:text-darkmode-text-light">Write your own recipes in plain words. Mark ingredients with <code>@</code>, pans with <code>#</code>, timers with <code>~</code>, and we work out the calories and set up a cook mode with timers.</p>
        <div className="flex gap-2"><button className="btn btn-outline-primary" onClick={() => setImporting(true)}>Import from a link</button><button className="btn btn-primary" onClick={() => { setDraft(null); setEditing("new"); }}>New recipe</button></div>
      </div>

      {mine.length === 0 ? (
        <div className="card p-8 text-center"><p className="font-secondary text-xl font-bold">Your cookbook is empty</p><p className="mx-auto mt-1 max-w-md text-text-light dark:text-darkmode-text-light">Your grandmother&apos;s tagine, your Sunday omelette, the thing you make after leg day. Write it once, cook it forever.</p><button className="btn btn-primary mt-4" onClick={() => setEditing("new")}>Write the first one</button></div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="My recipes">
          {mine.map((m) => {
            const p = parseCook(m.text); const n = nutritionOf(p, m.servings);
            return (
              <li key={m.id} className="card flex flex-col gap-3 p-4" data-testid="my-recipe">
                <div><h3 className="font-secondary text-xl font-bold">{m.name}</h3>
                  <p className="text-sm text-text-light dark:text-darkmode-text-light">{m.servings} {m.servings === 1 ? "serving" : "servings"} · {m.minutes} min · {p.ingredients.length} ingredients{m.sourceUrl ? " · imported" : ""}</p></div>
                <p className="text-sm"><b>{n.perServing.kcal} kcal</b> per serving · P {n.perServing.protein} g · C {n.perServing.carbs} g · F {n.perServing.fat} g</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <button className="btn btn-primary btn-sm" onClick={() => setCooking(m)}>Cook</button>
                  <button className="btn btn-outline-primary btn-sm" onClick={() => setEditing(m)}>Edit</button>
                  <button className="btn btn-outline-primary btn-sm" onClick={() => void toList(m)}>Shopping list</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AnimatePresence>
        {importing && <ImportSheet key="imp" onClose={() => setImporting(false)} onDraft={(d) => { setImporting(false); setDraft(d); setEditing("new"); }} />}
        {editing && <Editor key="ed" initial={editing === "new" ? null : editing} draft={editing === "new" ? draft : null} onClose={() => { setEditing(null); setDraft(null); }} onSaved={(m, isNew) => { onChange(isNew ? [m, ...mine] : mine.map((x) => (x.id === m.id ? m : x))); setEditing(null); say(isNew ? "Recipe saved" : "Changes saved"); }} onDeleted={(id) => { onChange(mine.filter((x) => x.id !== id)); setEditing(null); say("Recipe deleted"); }} />}
        {cooking && <CookMode key="cook" name={cooking.name} baseServings={cooking.servings} {...cookSetup(cooking)} onClose={() => setCooking(null)} />}
      </AnimatePresence>
      <ToastBar toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function Preview({ p, servings }: { p: Parsed; servings: number }) {
  const n = nutritionOf(p, servings);
  return (
    <div className="space-y-4" data-testid="recipe-preview">
      <div className="grid grid-cols-4 gap-2 rounded-xl bg-light p-3 text-center dark:bg-darkmode-light">
        {[["kcal", n.perServing.kcal], ["Protein", `${n.perServing.protein} g`], ["Carbs", `${n.perServing.carbs} g`], ["Fat", `${n.perServing.fat} g`]].map(([k, v]) => <div key={k}><p className="text-xs">{k}</p><p className="font-secondary text-lg font-bold tabular-nums" data-testid={`pv-${k}`}>{v}</p></div>)}
        <p className="col-span-4 text-xs text-text-light dark:text-darkmode-text-light">per serving, counting each amount as written (rice, pasta and meat are counted raw){n.left.length ? `. Not counted (no amount or not recognised): ${n.left.join(", ")}` : ""}</p>
      </div>
      {p.ingredients.length > 0 && <ul className="flex flex-wrap gap-1.5" aria-label="Ingredients found">{p.ingredients.map((l) => <li key={l.key} className={`rounded-full px-2.5 py-1 text-sm ${l.id ? "bg-[color:var(--sk-light)]" : "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200"}`} title={l.id ? "Recognised" : "We don't know this one, so it adds no calories"}>{l.name}{l.qty != null ? ` · ${qtyText(l.qty, l.unit)}` : ""}{l.optional ? " (optional)" : ""}</li>)}</ul>}
      {p.cookware.length > 0 && <p className="text-sm">Cookware: {p.cookware.join(", ")}</p>}
      <ol className="space-y-2">{p.steps.map((s, i) => (
        <li key={i} className="flex gap-3"><span className="course-no shrink-0" aria-hidden>{i + 1}.</span>
          <p>{s.tokens.map((t, k) => t.t === "text" ? <span key={k}>{t.v}</span> : t.t === "ing" ? <b key={k} className="text-[color:var(--sk-accent-text)]">{t.name}</b> : t.t === "cook" ? <em key={k} className="not-italic underline decoration-dotted">{t.name}</em> : <span key={k} className="rounded-full bg-[color:var(--sk-light)] px-2 text-sm font-semibold">⏱ {t.name || fmtTimer(t.seconds)}</span>)}</p></li>
      ))}</ol>
    </div>
  );
}

function Editor({ initial, draft, onClose, onSaved, onDeleted }: { initial: Mine | null; draft: Draft | null; onClose: () => void; onSaved: (m: Mine, isNew: boolean) => void; onDeleted: (id: string) => void }) {
  const [name, setName] = useState(initial?.name ?? draft?.name ?? "");
  const [servings, setServings] = useState(String(initial?.servings ?? draft?.servings ?? 2));
  const [minutes, setMinutes] = useState(String(initial?.minutes ?? draft?.minutes ?? 30));
  const [meals, setMeals] = useState(initial?.meals ?? "ld");
  const [text, setText] = useState(initial?.text ?? draft?.text ?? STARTER);
  const [q, setQ] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const parsed = useMemo(() => parseCook(text), [text]);
  const sug = useMemo(() => (q.trim().length >= 2 ? findIngredients(q, 5) : []), [q]);

  const insert = (s: string) => {
    const el = area.current; const a = el?.selectionStart ?? text.length, b = el?.selectionEnd ?? text.length;
    setText((t) => t.slice(0, a) + s + t.slice(b));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(a + s.length, a + s.length); });
  };
  async function save() {
    const sv = parseInt(servings, 10), mn = parseInt(minutes, 10);
    if (!name.trim()) return setErr("Give your recipe a name.");
    if (!(sv >= 1 && sv <= 24)) return setErr("Servings should be between 1 and 24.");
    if (!(mn >= 1)) return setErr("How many minutes does it take?");
    if (!parsed.steps.length) return setErr("Write at least one step.");
    setBusy(true); setErr("");
    const r = await saveMyRecipe({ id: initial?.id, name, servings: sv, minutes: mn, meals, text, sourceUrl: initial ? undefined : draft?.sourceUrl });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    onSaved({ id: r.id, name: name.trim(), servings: sv, minutes: mn, meals, text: text.trim(), sourceUrl: initial?.sourceUrl ?? draft?.sourceUrl ?? null }, !initial);
  }
  return (
    <Sheet label={initial ? "Edit recipe" : "New recipe"} title={initial ? "Edit recipe" : "New recipe"} onClose={onClose} wide>
      <div className="space-y-5 overflow-y-auto p-5">
        {draft && <p role="status" className="rounded-xl bg-[color:var(--sk-light)] px-3 py-2 text-sm" data-testid="import-note">Imported from <b>{new URL(draft.sourceUrl).hostname.replace(/^www\./, "")}</b>: {draft.found.ingredients} ingredients ({draft.found.recognised} recognised for calories) and {draft.found.steps} steps. Read it through and fix anything that looks off, then save. The recipe belongs to its author, so keep it for your own use.</p>}
        <div className="grid grid-cols-[1fr_auto_auto] gap-3">
          <div><label htmlFor="rn" className="form-label">Name</label><input id="rn" className="form-input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunday chicken rice" /></div>
          <div><label htmlFor="rs" className="form-label">Servings</label><input id="rs" inputMode="numeric" className="form-input !w-20" value={servings} onChange={(e) => setServings(e.target.value)} /></div>
          <div><label htmlFor="rm" className="form-label">Minutes</label><input id="rm" inputMode="numeric" className="form-input !w-20" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></div>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Good for"><span className="text-sm font-semibold">Good for</span>{MEAL_OPTS.map(([k, l]) => <button key={k} type="button" aria-pressed={meals.includes(k)} className={pill(meals.includes(k))} onClick={() => setMeals((m) => (m.includes(k) ? m.replace(k, "") : m + k))}>{l}</button>)}</div>

        <div>
          <div className="mb-1 flex flex-wrap items-end justify-between gap-2"><label htmlFor="rt" className="form-label !mb-0">The recipe <span className="font-normal text-text-light">blank line = new step</span></label>
            <div className="flex gap-1.5"><button type="button" className="soft-btn !px-3 !py-1 text-sm" onClick={() => insert("#pan{}")}># pan</button><button type="button" className="soft-btn !px-3 !py-1 text-sm" onClick={() => insert("~{10%minutes}")}>~ timer</button></div></div>
          <textarea id="rt" ref={area} rows={9} spellCheck className="form-input font-mono text-sm leading-relaxed" value={text} maxLength={8000} onChange={(e) => setText(e.target.value)} />
          <div className="relative mt-2">
            <input aria-label="Insert an ingredient" className="form-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Insert an ingredient: type to search…" />
            {sug.length > 0 && <ul className="mt-1 flex flex-wrap gap-1.5">{sug.map((i) => <li key={i.id}><button type="button" className="soft-btn !px-3 !py-1 text-sm" onClick={() => { insert(`@${i.names.en[0].toLowerCase()}{100%g}`); setQ(""); }}>{i.names.en[0]}</button></li>)}</ul>}
          </div>
          <p className="mt-2 text-xs text-text-light dark:text-darkmode-text-light">Ingredient: <code>@onion{"{2}"}</code> · with unit: <code>@olive oil{"{1%tbsp}"}</code> · optional: <code>@feta{"{50%g}(optional)"}</code> · pan: <code>#pot{"{}"}</code> · timer: <code>~{"{25%minutes}"}</code> · units: g kg ml l tsp tbsp cup oz lb</p>
        </div>

        <section aria-label="Preview"><h3 className="h5 mb-3">Preview</h3><Preview p={parsed} servings={parseInt(servings, 10) || 1} /></section>
        {err && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">{err}</p>}
        <div className="flex flex-wrap justify-between gap-3">
          {initial ? <button className="btn btn-sm border-red-600 bg-red-600 text-white" disabled={busy} onClick={() => { if (confirm("Delete this recipe?")) void deleteMyRecipe(initial.id).then(() => onDeleted(initial.id)); }}>Delete</button> : <span />}
          <button className="btn btn-primary" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save recipe"}</button>
        </div>
      </div>
    </Sheet>
  );
}

function ImportSheet({ onClose, onDraft }: { onClose: () => void; onDraft: (d: Draft) => void }) {
  const [url, setUrl] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault(); if (!url.trim()) return;
    setBusy(true); setErr("");
    const r = await importRecipe(url);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    onDraft(r.draft);
  }
  return (
    <Sheet label="Import a recipe" title="Import from a link" onClose={onClose}>
      <form onSubmit={go} className="space-y-4 p-5">
        <p className="text-sm text-text-light dark:text-darkmode-text-light">Paste the address of a recipe page. We read the ingredients and steps the site publishes, turn them into your own editable copy, and work out the calories. Nothing is saved until you press Save.</p>
        <div><label htmlFor="imp-url" className="form-label">Recipe link</label><input id="imp-url" autoFocus inputMode="url" className="form-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></div>
        {err && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">{err}</p>}
        <div className="flex justify-between gap-3"><button type="button" className="btn btn-outline-primary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !url.trim()}>{busy ? "Reading the page…" : "Import"}</button></div>
      </form>
    </Sheet>
  );
}
