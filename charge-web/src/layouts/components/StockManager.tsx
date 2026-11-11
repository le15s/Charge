"use client";

import { addStockItem, deleteStockItem, restockItem, setStockQuantity, updateStockItem } from "@/app/actions/stock";
import { CATEGORIES, fmtQty, PRESETS, RETAILERS, retailerLink, retailerName, stockStatus, todayStr, type StockRow } from "@/lib/stock";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Item = StockRow & { quantityAt: number };
type Form = { name: string; kind: string; category: string; unit: string; quantity: string; perDay: string; packSize: string; retailer: string; productUrl: string; remindDaysBefore: string; repeat: boolean; repeatEveryDays: string; nextOrderOn: string; note: string };

const blank: Form = { name: "", kind: "", category: "protein", unit: "servings", quantity: "0", perDay: "1", packSize: "30", retailer: "amazon", productUrl: "", remindDaysBefore: "7", repeat: false, repeatEveryDays: "30", nextOrderOn: "", note: "" };
const num = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isNaN(n) ? NaN : n; };
const plusDays = (n: number) => todayStr(new Date(Date.now() + n * 864e5));

const BAR: Record<string, string> = { ok: "bg-plate-green dark:bg-darkmode-plate-green", low: "bg-plate-yellow dark:bg-darkmode-plate-yellow", out: "bg-plate-red dark:bg-darkmode-plate-red" };

const TAG: Record<string, string> = {
  ok: "bg-plate-green text-white dark:bg-darkmode-plate-green dark:text-text-dark",
  low: "bg-plate-yellow text-[#1d1500] dark:bg-darkmode-plate-yellow",
  out: "bg-plate-red text-white dark:bg-darkmode-plate-red dark:text-text-dark",
};

/** A fuel-gauge made of steps that grow taller. Filled steps pop in one after another. */
function StepGauge({ pct, state, label }: { pct: number; state: string; label: string }) {
  const N = 16, on = Math.round((pct / 100) * N);
  return (
    <div className="flex h-6 items-end gap-[3px]" role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: N }, (_, i) => (
        <motion.i key={i} className={`block grow rounded-[2px] ${i < on ? BAR[state] : "bg-light dark:bg-darkmode-light"}`} style={{ height: 9 + i * 0.95, transformOrigin: "bottom" }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.03, type: "spring", stiffness: 420, damping: 20 }} />
      ))}
    </div>
  );
}

/** A made-up barcode, always the same for the same item. Just decoration. */
function Barcode({ seed }: { seed: string }) {
  let h = 7;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  let x = 0;
  const bars: { x: number; w: number }[] = [];
  for (let i = 0; i < 30; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const w = 1 + ((h >>> 27) % 3);
    if (i % 2 === 0) bars.push({ x, w });
    x += w + 1;
  }
  return <svg aria-hidden viewBox={`0 0 ${x} 18`} className="h-4 w-24 text-text-dark opacity-60 dark:text-darkmode-text-dark" preserveAspectRatio="none">{bars.map((b, i) => <rect key={i} x={b.x} width={b.w} height="18" fill="currentColor" />)}</svg>;
}

function toForm(it: Item): Form {
  return { name: it.name, kind: "", category: it.category, unit: it.unit, quantity: fmtQty(stockStatus(it).left), perDay: String(it.perDay), packSize: String(it.packSize), retailer: it.retailer, productUrl: it.productUrl ?? "", remindDaysBefore: String(it.remindDaysBefore), repeat: !!it.repeatEveryDays, repeatEveryDays: String(it.repeatEveryDays ?? 30), nextOrderOn: it.nextOrderOn ?? plusDays(it.repeatEveryDays ?? 30), note: it.note ?? "" };
}

export default function StockManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<null | { id: string | null; form: Form }>(null);
  const [error, setError] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [count, setCount] = useState<{ id: string; v: string } | null>(null);

  const list = items.map((it) => ({ it, st: stockStatus(it) })).sort((a, b) => a.st.daysLeft - b.st.daysLeft);
  const need = list.filter((x) => x.st.needsOrder).length;

  function save() {
    if (!editing) return;
    const f = editing.form;
    const finalName = f.name.trim() || f.kind;
    const payload = {
      name: finalName, category: f.category, unit: f.unit.trim() || "servings", quantity: num(f.quantity), perDay: num(f.perDay), packSize: num(f.packSize), retailer: f.retailer,
      productUrl: f.productUrl.trim() || null, remindDaysBefore: Math.round(num(f.remindDaysBefore)), repeatEveryDays: f.repeat ? Math.round(num(f.repeatEveryDays)) : null,
      nextOrderOn: f.repeat ? (f.nextOrderOn || plusDays(Math.round(num(f.repeatEveryDays)) || 30)) : null, note: f.note.trim() || null,
    };
    if (!finalName) return setError("Pick a type above or give the item a name.");
    if ([payload.quantity, payload.perDay, payload.packSize, payload.remindDaysBefore].some((n) => isNaN(n))) return setError("Check the numbers: amount, use per day, pack size and reminder days.");
    setError("");
    start(async () => {
      const r = editing.id ? await updateStockItem(editing.id, payload) : await addStockItem(payload);
      if (!r.ok) return setError(r.error);
      setEditing(null); router.refresh();
    });
  }
  const set = (patch: Partial<Form>) => setEditing((e) => e && { ...e, form: { ...e.form, ...patch } });
  const f = editing?.form;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-text-dark dark:text-darkmode-text-dark">{items.length === 0 ? "Nothing here yet" : need ? `${need} item${need > 1 ? "s" : ""} to reorder` : "Everything is stocked up"}</p>
        <button className="btn btn-primary" onClick={() => { setError(""); setEditing({ id: null, form: blank }); }}>Add an item</button>
      </div>

      {items.length === 0 && (
        <div className="card border-dashed p-8 text-center">
          <p className="font-secondary text-3xl font-extrabold text-text-dark dark:text-darkmode-text-dark">What do you keep in the cupboard?</p>
          <p className="mx-auto mb-5 mt-1 max-w-md">Tap a quick add to start. You can change every number after.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map((p) => <button key={p.name} className="rounded-full bg-light px-4 py-2 text-sm font-semibold hover:bg-border dark:bg-darkmode-light" onClick={() => { setError(""); setEditing({ id: null, form: { ...blank, kind: p.name, category: p.category, unit: p.unit, perDay: String(p.perDay), packSize: String(p.packSize), quantity: String(p.packSize) } }); }}>{p.name}</button>)}
          </div>
        </div>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        <AnimatePresence initial={false}>
          {list.map(({ it, st }) => {
            const cover = Math.max(it.remindDaysBefore * 3, 14);
            const pct = isFinite(st.daysLeft) ? Math.min(100, (st.daysLeft / cover) * 100) : 100;
            return (
              <motion.li layout key={it.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="card crate flex flex-col p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0"><h2 className="h5 truncate">{it.name}</h2><p className="text-sm text-text-light dark:text-darkmode-text-light">{CATEGORIES.find((c) => c.id === it.category)?.label} · {fmtQty(it.perDay)} {it.unit}/day</p></div>
                  <span className={`ship-tag shrink-0 ${TAG[st.state]}`}>{st.state === "out" ? "Out" : st.state === "low" ? "Running low" : "In stock"}</span>
                </div>
                <p className="font-secondary text-4xl font-black leading-none text-text-dark dark:text-darkmode-text-dark">{fmtQty(st.left)} <span className="text-lg font-bold text-text-light">{it.unit} left</span></p>
                <div className="mb-3 mt-3"><StepGauge pct={pct} state={st.state} label="Stock left" /></div>
                <p className="mb-4 text-sm">
                  {st.runsOutOn ? `Runs out around ${st.runsOutOn.toLocaleDateString("en-US", { month: "short", day: "numeric" })} (${Math.max(0, Math.ceil(st.daysLeft))} days).` : "You don't use this daily."}
                  {it.repeatEveryDays && it.nextOrderOn ? ` Scheduled reorder: ${new Date(it.nextOrderOn + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}${st.scheduleDue ? " (due)" : ""}.` : ""}
                </p>
                <div className="mb-3 flex items-center justify-between gap-3" aria-hidden><span className="sku">SKU-{it.id.slice(0, 6).toUpperCase()}</span><Barcode seed={it.id} /></div>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <a href={retailerLink(it)} target="_blank" rel="noopener noreferrer" className={`btn btn-sm ${st.needsOrder ? "btn-primary" : "btn-outline-primary"}`}>Reorder on {retailerName(it.retailer)}</a>
                  <button className="btn btn-outline-primary btn-sm" disabled={pending} onClick={() => start(async () => { await restockItem(it.id); router.refresh(); })}>It arrived (+{fmtQty(it.packSize)})</button>
                  <button className="px-2 text-sm font-semibold underline" onClick={() => setCount({ id: it.id, v: fmtQty(st.left) })}>Count</button>
                  <button className="px-2 text-sm font-semibold underline" onClick={() => { setError(""); setEditing({ id: it.id, form: toForm(it) }); }}>Edit</button>
                  <button className="ml-auto px-2 text-sm text-red-600 underline dark:text-red-400" onClick={() => setConfirmDel(it.id)}>Delete</button>
                </div>
                {count?.id === it.id && (
                  <form className="mt-3 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); const v = num(count.v); if (isNaN(v)) return; start(async () => { await setStockQuantity(it.id, v); setCount(null); router.refresh(); }); }}>
                    <label className="text-sm" htmlFor={`c${it.id}`}>I have</label>
                    <input id={`c${it.id}`} autoFocus inputMode="decimal" className="form-input !w-24 !py-2" value={count.v} onChange={(e) => setCount({ id: it.id, v: e.target.value })} />
                    <span className="text-sm">{it.unit}</span><button className="btn btn-primary btn-sm">Save</button><button type="button" className="px-2 text-sm underline" onClick={() => setCount(null)}>Cancel</button>
                  </form>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <p className="rounded-xl bg-light p-4 text-sm dark:bg-darkmode-light">
        <b>About ordering:</b> Amazon, AliExpress and Alibaba don&apos;t let a site like this buy for you from your personal account, so Charge can&apos;t place the order itself. It does the part it can: it counts down your stock, reminds you on Home, and opens the product page (or a search for it) so you only press Buy.
      </p>

      <AnimatePresence>
        {confirmDel && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDel(null)}>
            <motion.div role="alertdialog" aria-modal="true" initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="h5 mb-2">Delete this item?</h2><p className="mb-5">It disappears from Stock. This can&apos;t be undone.</p>
              <div className="flex justify-end gap-3"><button className="btn btn-outline-primary btn-sm" onClick={() => setConfirmDel(null)}>Keep it</button>
                <button className="btn btn-sm border-red-600 bg-red-600 text-white" onClick={() => start(async () => { await deleteStockItem(confirmDel); setConfirmDel(null); router.refresh(); })}>Delete</button></div>
            </motion.div>
          </motion.div>
        )}
        {editing && f && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditing(null)}>
            <motion.form role="dialog" aria-modal="true" aria-label={editing.id ? "Edit item" : "Add an item"} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 34 }}
              onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save(); }} className="card max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-b-2xl">
              <h2 className="h4 mb-4">{editing.id ? "Edit item" : "Add an item"}</h2>
              {!editing.id && (
                <div className="mb-4 flex flex-wrap gap-2">{PRESETS.map((p) => <button type="button" key={p.name} onClick={() => set({ kind: p.name, category: p.category, unit: p.unit, perDay: String(p.perDay), packSize: String(p.packSize), quantity: String(p.packSize) })} className="rounded-full bg-light px-3 py-1 text-sm font-semibold hover:bg-border dark:bg-darkmode-light">{p.name}</button>)}</div>
              )}
              <div className="space-y-4">
                <div><label className="form-label" htmlFor="sname">Name {f.kind && <span className="font-normal text-text-light">optional, we&apos;ll call it {f.kind} if you leave it empty</span>}</label><input id="sname" className="form-input placeholder:opacity-50" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder={f.kind || "e.g. Whey protein, vanilla"} /></div>
                <div><span className="form-label">Type</span><div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <button type="button" key={c.id} aria-pressed={f.category === c.id} onClick={() => set({ category: c.id })} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${f.category === c.id ? "bg-primary text-white dark:bg-darkmode-primary dark:text-text-dark" : "bg-light dark:bg-darkmode-light"}`}>{c.label}</button>)}</div></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="form-label" htmlFor="sunit">Counted in</label><input id="sunit" className="form-input" value={f.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="scoops, bars…" /></div>
                  <div><label className="form-label" htmlFor="sq">I have now</label><input id="sq" inputMode="decimal" className="form-input" value={f.quantity} onChange={(e) => set({ quantity: e.target.value })} /></div>
                  <div><label className="form-label" htmlFor="spd">I use per day</label><input id="spd" inputMode="decimal" className="form-input" value={f.perDay} onChange={(e) => set({ perDay: e.target.value })} /></div>
                  <div><label className="form-label" htmlFor="spk">One pack contains</label><input id="spk" inputMode="decimal" className="form-input" value={f.packSize} onChange={(e) => set({ packSize: e.target.value })} /></div>
                </div>
                <div><span className="form-label">Order from</span><div className="flex flex-wrap gap-2">{RETAILERS.map((r) => <button type="button" key={r.id} aria-pressed={f.retailer === r.id} onClick={() => set({ retailer: r.id })} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${f.retailer === r.id ? "bg-primary text-white dark:bg-darkmode-primary dark:text-text-dark" : "bg-light dark:bg-darkmode-light"}`}>{r.name}</button>)}</div></div>
                <div><label className="form-label" htmlFor="surl">Product link <span className="font-normal text-text-light">optional, otherwise we search the shop for the name</span></label><input id="surl" inputMode="url" className="form-input" value={f.productUrl} onChange={(e) => set({ productUrl: e.target.value })} placeholder="https://…" /></div>
                <div><label className="form-label" htmlFor="srem">Remind me when this many days are left</label><input id="srem" inputMode="numeric" className="form-input !w-28" value={f.remindDaysBefore} onChange={(e) => set({ remindDaysBefore: e.target.value })} /></div>
                <div className="rounded-xl bg-light p-4 dark:bg-darkmode-light">
                  <label className="flex items-center gap-3 font-semibold text-text-dark dark:text-darkmode-text-dark"><input type="checkbox" checked={f.repeat} onChange={(e) => set({ repeat: e.target.checked, nextOrderOn: e.target.checked && !f.nextOrderOn ? plusDays(num(f.repeatEveryDays) || 30) : f.nextOrderOn })} /> Also remind me on a fixed schedule</label>
                  {f.repeat && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div><label className="form-label" htmlFor="srep">Every (days)</label><input id="srep" inputMode="numeric" className="form-input" value={f.repeatEveryDays} onChange={(e) => set({ repeatEveryDays: e.target.value })} /></div>
                      <div><label className="form-label" htmlFor="snext">Next order on</label><input id="snext" type="date" className="form-input" value={f.nextOrderOn} onChange={(e) => set({ nextOrderOn: e.target.value })} /></div>
                    </div>
                  )}
                </div>
                {error && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
                <div className="flex justify-end gap-3 pt-1"><button type="button" className="btn btn-outline-primary" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : editing.id ? "Save changes" : "Add item"}</button></div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
