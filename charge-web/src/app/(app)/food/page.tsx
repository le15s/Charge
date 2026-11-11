import FoodHub from "@/components/FoodHub";
import { PageHeader } from "@/components/SectionHeaders";
import { getDayLog, getKitchen, getMenu } from "@/app/actions/food";
import { listMyRecipes } from "@/app/actions/recipes";
import { shoppingCount } from "@/app/actions/shopping";
import { calcTargets } from "@/lib/nutrition";
import { requireOnboarded } from "@/lib/session";

export const metadata = { title: "Food" };

export default async function FoodPage({ searchParams }: { searchParams: Promise<{ day?: string; tab?: string }> }) {
  const { day, tab } = await searchParams;
  const { profile } = await requireOnboarded();
  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : 30;
  const targets = profile.weightKg && profile.heightCm ? calcTargets({ weightKg: profile.weightKg, heightCm: profile.heightCm, age, gender: profile.gender ?? "male", activity: profile.activity ?? 1.375, goal: profile.goal ?? "maintain" }) : { kcal: 2200, protein: 140, carbs: 250, fat: 70, water: 2500, bmr: 0, tdee: 0 };
  const hasDay = !!day && /^\d{4}-\d{2}-\d{2}$/.test(day);
  const initialDay = hasDay ? day! : new Date().toISOString().slice(0, 10);
  const [entries, kitchen, menu, shopCount, mine] = await Promise.all([getDayLog(initialDay), getKitchen(), getMenu(), shoppingCount(), listMyRecipes()]);
  const initialTab = tab === "menu" || tab === "recipes" || tab === "mine" || tab === "plan" || tab === "shopping" ? tab : "today";
  return (
    <div>
      <PageHeader title="Food" tone="green">Log what you ate in seconds, set a menu that fills your day by itself, or type what&apos;s in the fridge and get recipes that fit your goal.</PageHeader>
      <FoodHub
        initialDay={initialDay} hasDayParam={hasDay} initialTab={initialTab}
        initialEntries={entries.map((e) => ({ id: e.id, menuItemId: e.menuItemId, meal: e.meal, name: e.name, grams: e.grams, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat }))}
        targets={{ kcal: targets.kcal, protein: targets.protein, carbs: targets.carbs, fat: targets.fat }}
        goal={profile.goal ?? "maintain"} weightKg={profile.weightKg ?? null} diet={profile.diet ?? null} lang={kitchen.foodLang} kitchen={{ equipment: kitchen.equipment, haveSpices: kitchen.haveSpices, noSpices: kitchen.noSpices }} mine={mine} menuCount={menu.items.length} shopCount={shopCount}
      />
    </div>
  );
}
