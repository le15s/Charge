/** Supermarket sections, in the order you walk through a shop. */
export const AISLES = ["Fruit & veg", "Meat & fish", "Dairy & eggs", "Bread, rice & pasta", "Tins, beans & tofu", "Nuts & seeds", "Pantry", "Spices & herbs", "Other"] as const;
export type Aisle = (typeof AISLES)[number];

const BY_CAT: Record<string, Aisle> = {
  veg: "Fruit & veg", fruit: "Fruit & veg", meat: "Meat & fish", fish: "Meat & fish", dairy: "Dairy & eggs", egg: "Dairy & eggs",
  grain: "Bread, rice & pasta", legume: "Tins, beans & tofu", nut: "Nuts & seeds", sauce: "Pantry", fat: "Pantry", sweet: "Pantry", other: "Pantry",
  spice: "Spices & herbs", herb: "Spices & herbs",
};
export const aisleFor = (cat: string | undefined): Aisle => (cat && BY_CAT[cat]) || "Other";
