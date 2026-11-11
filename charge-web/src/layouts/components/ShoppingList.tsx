"use client";

import { addShoppingText, clearShopping, getShopping, removeShopping, toggleShopping, type ShopRow } from "@/app/actions/shopping";
import { AISLES } from "@/lib/aisles";
import { ING_BY_ID, nameOf, type Lang } from "@/lib/food-index";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ToastBar, type Toast } from "./FoodBits";

const qty = (g: number | null) => (g == null || g <= 0 ? "" : g >= 1000 ? `${Math.round(g / 100) / 10} kg` : `${Math.max(5, Math.round(g / 5) * 5)} g`);
const STORE = "charge-pantry";

/** Things to buy. Fill it from a recipe ("Add missing to my list") or type anything. Ticked items drop to the basket. */
export default function ShoppingList({ lang, onChanged }: { lang: Lang; onChanged: (count: number) => void }) {
  const [items, setItems] = useState<ShopRow[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const say = (t: string) => setToast({ text: t, id: Date.now() });

  const load = useCallback(async () => { const r = await getShopping(); setItems(r); onChanged(r.filter((x) => !x.checked).length); }, [onChanged]);
  useEffect(() => { void load(); }, [load]);

  const display = (r: ShopRow) => { const ing = r.ingredientId ? ING_BY_ID.get(r.ingredientId) : undefined; const n = ing ? nameOf(ing, lang) : r.name; return n.charAt(0).toUpperCase() + n.slice(1); };
  const open = useMemo(() => (items ?? []).filter((i) => !i.checked), [items]);
  const done = useMemo(() => (items ?? []).filter((i) => i.checked), [items]);
  const groups = useMemo(() => AISLES.map((a) => ({ aisle: a, rows: open.filter((i) => i.aisle === a || (!AISLES.includes(i.aisle as (typeof AISLES)[number]) && a === "Other")) })).filter((g) => g.rows.length), [open]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 2) return;
    setBusy(true); await addShoppingText(text, lang); setText(""); await load(); setBusy(false);
  }
  async function tick(i: ShopRow) {
    setItems((c) => c!.map((x) => (x.id === i.id ? { ...x, checked: !x.checked } : x)));
    onChanged((items ?? []).filter((x) => (x.id === i.id ? i.checked : !x.checked)).length);
    await toggleShopping(i.id, !i.checked);
  }
  async function remove(i: ShopRow) { setItems((c) => c!.filter((x) => x.id !== i.id)); await removeShopping(i.id); void load(); }
  async function clearDone() { await clearShopping(true); say("Ticked items cleared"); void load(); }
  async function clearAll() { if (!window.confirm("Empty the whole list?")) return; await clearShopping(false); void load(); }
  async function copy() {
    const lines = groups.flatMap((g) => [`${g.aisle}:`, ...g.rows.map((r) => `- ${display(r)}${qty(r.grams) ? ` (${qty(r.grams)})` : ""}`)]);
    try { await navigator.clipboard.writeText(lines.join("\n")); say("List copied"); } catch { say("Couldn't copy here"); }
  }
  /** Bought them: they go into "what I have" for the recipe finder, and leave the list. */
  async function bought() {
    const ids = done.map((d) => d.ingredientId).filter((x): x is string => !!x);
    try { const s = JSON.parse(localStorage.getItem(STORE) ?? "null") ?? {}; s.have = [...new Set([...(s.have ?? []), ...ids])]; localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* private mode */ }
    await clearShopping(true); say(ids.length ? `${ids.length} item${ids.length > 1 ? "s" : ""} added to what you have` : "Cleared"); void load();
  }

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="gingham h-3" aria-hidden />
        <div className="space-y-3 p-5">
          <div><h2 className="h4">Shopping list</h2><p className="mt-1 text-sm">Add what&apos;s missing from a recipe in one tap, or type anything here. Items are sorted by supermarket aisle.</p></div>
          <form onSubmit={add} className="flex gap-2">
            <label htmlFor="shop-add" className="sr-only">Add to the list</label>
            <input id="shop-add" className="form-input" placeholder="milk, 2 limones, أرز, pain…" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn btn-primary" disabled={busy || text.trim().length < 2}>Add</button>
          </form>
        </div>
      </section>

      {items === null ? <p>Loading…</p> : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center dark:border-darkmode-border">
          <p className="font-secondary text-2xl font-black text-text-dark dark:text-darkmode-text-dark">Nothing to buy</p>
          <p className="mx-auto mt-1 max-w-md text-sm">Open a recipe in the Recipes tab and press &ldquo;Add missing to my list&rdquo;, or type items above.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-outline-primary btn-sm" onClick={() => void copy()} disabled={!open.length}>Copy list</button>
            <button className="btn btn-outline-primary btn-sm" onClick={() => void clearAll()}>Empty list</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((g) => (
              <section key={g.aisle} className="card overflow-hidden" aria-label={g.aisle}>
                <header className="flex items-center gap-3 border-b border-border px-5 py-3 dark:border-darkmode-border"><h3 className="h5">{g.aisle}</h3><span className="leader" aria-hidden /><span className="text-sm font-semibold tabular-nums">{g.rows.length}</span></header>
                <ul>
                  <AnimatePresence initial={false}>
                    {g.rows.map((r) => <Row key={r.id} r={r} name={display(r)} onTick={() => void tick(r)} onRemove={() => void remove(r)} />)}
                  </AnimatePresence>
                </ul>
              </section>
            ))}
          </div>
          {done.length > 0 && (
            <section className="card overflow-hidden" aria-label="In the basket">
              <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3 dark:border-darkmode-border"><h3 className="h5">In the basket</h3><span className="leader" aria-hidden /><button className="btn btn-primary btn-sm" onClick={() => void bought()}>I bought these</button><button className="btn btn-outline-primary btn-sm" onClick={() => void clearDone()}>Clear</button></header>
              <ul><AnimatePresence initial={false}>{done.map((r) => <Row key={r.id} r={r} name={display(r)} onTick={() => void tick(r)} onRemove={() => void remove(r)} />)}</AnimatePresence></ul>
              <p className="px-5 py-3 text-xs text-text-light dark:text-darkmode-text-light">&ldquo;I bought these&rdquo; adds them to what you have, so the recipe finder knows.</p>
            </section>
          )}
        </>
      )}
      <ToastBar toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function Row({ r, name, onTick, onRemove }: { r: ShopRow; name: string; onTick: () => void; onRemove: () => void }) {
  return (
    <motion.li layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-b border-border last:border-0 dark:border-darkmode-border">
      <div className="flex items-center gap-3 px-5 py-2.5">
        <button role="checkbox" aria-checked={r.checked} aria-label={`${r.checked ? "Put back" : "Tick off"} ${name}`} onClick={onTick} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${r.checked ? "border-primary bg-primary text-white dark:border-darkmode-primary dark:bg-darkmode-primary dark:text-text-dark" : "border-border hover:border-primary dark:border-darkmode-border"}`}>
          {r.checked && <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 tick-draw" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 8.5l3.2 3L13 4.5" /></svg>}
        </button>
        <div className={`min-w-0 grow ${r.checked ? "text-text-light line-through decoration-1" : ""}`}>
          <p className="truncate font-semibold text-text-dark dark:text-darkmode-text-dark">{name}</p>
          {r.note && <p className="truncate text-xs text-text-light dark:text-darkmode-text-light">{r.note}</p>}
        </div>
        {qty(r.grams) && <span className="shrink-0 text-sm tabular-nums text-text-light dark:text-darkmode-text-light">{qty(r.grams)}</span>}
        <button className="px-1.5 text-xl text-text-light hover:text-red-600" aria-label={`Remove ${name}`} onClick={onRemove}>×</button>
      </div>
    </motion.li>
  );
}
