"use client";

import { saveKitchen } from "@/app/actions/food";
import { shoppingCount } from "@/app/actions/shopping";
import { LANGS, type Lang } from "@/lib/food-index";
import type { Kitchen } from "@/lib/recipes";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import type { Mine } from "./Cookbook";
import dynamic from "next/dynamic";
import FoodTracker from "./FoodTracker";

// Each of these tabs loads its code only when it is opened, so the Today tab stays light.
const panelLoading = () => <p className="py-8 text-center text-sm opacity-70" role="status">Loading…</p>;
const Cookbook = dynamic(() => import("./Cookbook"), { loading: panelLoading });
const MealPlanner = dynamic(() => import("./MealPlanner"), { loading: panelLoading });
const MenuManager = dynamic(() => import("./MenuManager"), { loading: panelLoading });
const RecipeFinder = dynamic(() => import("./RecipeFinder"), { loading: panelLoading });
const ShoppingList = dynamic(() => import("./ShoppingList"), { loading: panelLoading });

type Entry = Parameters<typeof FoodTracker>[0]["initialEntries"][number];
const TABS = [["today", "Today"], ["menu", "My menu"], ["recipes", "Recipes"], ["mine", "My recipes"], ["plan", "Week plan"], ["shopping", "Shopping"]] as const;
type Tab = (typeof TABS)[number][0];

/** Food page: today's log, the set menu, and the recipe finder, with one language for all food names. */
export default function FoodHub(props: {
  initialDay: string; hasDayParam: boolean; initialEntries: Entry[]; targets: { kcal: number; protein: number; carbs: number; fat: number };
  goal: string; weightKg: number | null; diet: string | null; lang: Lang; kitchen: Kitchen; menuCount: number; shopCount: number; mine: Mine[]; initialTab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(props.initialTab);
  const [lang, setLang] = useState<Lang>(props.lang);
  const [mine, setMine] = useState<Mine[]>(props.mine);
  const [menuCount, setMenuCount] = useState(props.menuCount);
  const [shopCount, setShopCount] = useState(props.shopCount);
  const onMenuChanged = useCallback((n: number) => setMenuCount(n), []);
  const refreshShop = useCallback(() => { void shoppingCount().then(setShopCount); }, []);

  const pickTab = (t: Tab) => { setTab(t); try { const u = new URL(window.location.href); u.searchParams.set("tab", t); window.history.replaceState(null, "", u); } catch { /* ignore */ } };
  const pickLang = (l: Lang) => { setLang(l); void saveKitchen({ foodLang: l }); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex max-w-full overflow-x-auto rounded-full border-2 border-border bg-card p-1 [scrollbar-width:none] dark:border-darkmode-border dark:bg-darkmode-card" role="tablist" aria-label="Food sections">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" id={`ftab-${id}`} aria-selected={tab === id} aria-controls={`fpanel-${id}`} onClick={() => pickTab(id)} className={`relative z-10 shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold transition-colors sm:px-5 ${tab === id ? "text-white dark:text-text-dark" : "text-text-dark hover:text-primary dark:text-darkmode-text-dark"}`}>
              {tab === id && <motion.span layoutId="food-tab" className="absolute inset-0 -z-10 rounded-full bg-primary dark:bg-darkmode-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              {label}{id === "menu" && menuCount > 0 ? <span className="ml-1.5 text-xs opacity-80">{menuCount}</span> : null}{id === "shopping" && shopCount > 0 ? <span className="ml-1.5 text-xs opacity-80">{shopCount}</span> : null}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-text-light dark:text-darkmode-text-light">Food names in</span>
          <select className="form-input !w-auto !py-1.5" value={lang} onChange={(e) => pickLang(e.target.value as Lang)} aria-label="Language for food names and search">
            {LANGS.map((l) => <option key={l.id} value={l.id}>{l.native}</option>)}
          </select>
        </label>
      </div>

      <div role="tabpanel" id="fpanel-today" aria-labelledby="ftab-today" hidden={tab !== "today"}>
        <FoodTracker goal={props.goal} weightKg={props.weightKg} diet={props.diet} initialDay={props.initialDay} hasDayParam={props.hasDayParam} initialEntries={props.initialEntries} targets={props.targets} lang={lang} active={tab === "today"} menuCount={menuCount} onGoMenu={() => pickTab("menu")} />
      </div>
      {tab === "menu" && <div role="tabpanel" id="fpanel-menu" aria-labelledby="ftab-menu"><MenuManager lang={lang} onChanged={onMenuChanged} /></div>}
      {tab === "recipes" && <div role="tabpanel" id="fpanel-recipes" aria-labelledby="ftab-recipes"><RecipeFinder profileDiet={props.diet} goal={props.goal} dayKcal={props.targets.kcal} lang={lang} kitchen={props.kitchen} mine={mine} onShoppingChanged={refreshShop} /></div>}
      {tab === "mine" && <div role="tabpanel" id="fpanel-mine" aria-labelledby="ftab-mine"><Cookbook mine={mine} onChange={setMine} onShopping={refreshShop} /></div>}
      {tab === "plan" && <div role="tabpanel" id="fpanel-plan" aria-labelledby="ftab-plan"><MealPlanner mine={mine} kitchen={props.kitchen} dayKcal={props.targets.kcal} onShopping={refreshShop} /></div>}
      {tab === "shopping" && <div role="tabpanel" id="fpanel-shopping" aria-labelledby="ftab-shopping"><ShoppingList lang={lang} onChanged={setShopCount} /></div>}
    </div>
  );
}
