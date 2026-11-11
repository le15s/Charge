export const RETAILERS = [
  { id: "amazon", name: "Amazon", search: (q: string) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}` },
  { id: "aliexpress", name: "AliExpress", search: (q: string) => `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(q)}` },
  { id: "alibaba", name: "Alibaba", search: (q: string) => `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}` },
  { id: "other", name: "Other shop", search: (q: string) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}` },
] as const;

export const CATEGORIES = [
  { id: "protein", label: "Protein" },
  { id: "bar", label: "Bars & snacks" },
  { id: "supplement", label: "Supplements" },
  { id: "drink", label: "Drinks" },
  { id: "other", label: "Other" },
] as const;

/** Quick-add presets: tap one and the form is mostly filled in. */
export const PRESETS = [
  { name: "Whey protein", category: "protein", unit: "scoops", perDay: 1, packSize: 30 },
  { name: "Protein bars", category: "bar", unit: "bars", perDay: 1, packSize: 12 },
  { name: "Energy bars", category: "bar", unit: "bars", perDay: 1, packSize: 12 },
  { name: "Creatine", category: "supplement", unit: "servings", perDay: 1, packSize: 60 },
  { name: "Pre-workout", category: "supplement", unit: "scoops", perDay: 1, packSize: 30 },
  { name: "Omega-3", category: "supplement", unit: "capsules", perDay: 2, packSize: 120 },
  { name: "Multivitamin", category: "supplement", unit: "capsules", perDay: 1, packSize: 90 },
  { name: "BCAA / EAA", category: "supplement", unit: "scoops", perDay: 1, packSize: 30 },
] as const;

export type StockRow = {
  id: string; name: string; category: string; unit: string; quantity: number; quantityAt: Date | number; perDay: number; packSize: number;
  retailer: string; productUrl: string | null; remindDaysBefore: number; repeatEveryDays: number | null; nextOrderOn: string | null; note: string | null;
};

const DAY = 864e5;
export const todayStr = (d = new Date()) => d.toISOString().slice(0, 10);

export function retailerLink(it: Pick<StockRow, "retailer" | "productUrl" | "name">) {
  if (it.productUrl && /^https?:\/\//i.test(it.productUrl)) return it.productUrl;
  return (RETAILERS.find((r) => r.id === it.retailer) ?? RETAILERS[0]).search(it.name);
}
export const retailerName = (id: string) => RETAILERS.find((r) => r.id === id)?.name ?? "the shop";

export function stockStatus(it: StockRow, now = Date.now()) {
  const at = typeof it.quantityAt === "number" ? it.quantityAt : it.quantityAt.getTime();
  const used = it.perDay * Math.max(0, (now - at) / DAY);
  const left = Math.max(0, it.quantity - used);
  const daysLeft = it.perDay > 0 ? left / it.perDay : Infinity;
  const runsOutOn = isFinite(daysLeft) ? new Date(now + daysLeft * DAY) : null;
  const scheduleDue = !!(it.repeatEveryDays && it.nextOrderOn && it.nextOrderOn <= todayStr(new Date(now)));
  const state: "out" | "low" | "ok" = daysLeft <= 0.05 ? "out" : daysLeft <= it.remindDaysBefore ? "low" : "ok";
  return { left, daysLeft, runsOutOn, scheduleDue, needsOrder: state !== "ok" || scheduleDue, state };
}

export const fmtQty = (n: number) => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));
