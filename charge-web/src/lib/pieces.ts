/** Typical weight of one piece of common foods, so "2 eggs" or "1 banana" can be logged without a scale. Grams are edible weight (no shell, peel, core or bone). Values follow the USDA FoodData Central "medium" portions. */
export type Piece = { g: number; one: string; many: string };

// Order matters: the specific entries (cherry tomato, egg white, sweet potato) come before the general ones.
const P = (re: RegExp, g: number, one: string, many = one + "s"): [RegExp, Piece] => [re, { g, one, many }];

const TABLE: [RegExp, Piece][] = [
  P(/\begg whites?\b/, 33, "egg white"),
  P(/\begg yolks?\b/, 17, "egg yolk"),
  P(/\beggs?\b/, 50, "egg"),
  P(/\bcherry tomato/, 17, "tomato", "tomatoes"),
  P(/\btomato(es)?\b/, 123, "tomato", "tomatoes"),
  P(/\bsweet potato/, 130, "sweet potato", "sweet potatoes"),
  P(/\bpotato(es)?\b/, 173, "potato", "potatoes"),
  P(/\bbananas?\b/, 118, "banana"),
  P(/\bapples?\b/, 182, "apple"),
  P(/\boranges?\b/, 131, "orange"),
  P(/\bclementines?\b/, 74, "clementine"),
  P(/\b(mandarin|tangerine)s?\b/, 88, "mandarin"),
  P(/\bpears?\b/, 178, "pear"),
  P(/\bpeach(es)?\b/, 150, "peach", "peaches"),
  P(/\bnectarines?\b/, 142, "nectarine"),
  P(/\bplums?\b/, 66, "plum"),
  P(/\bkiwi/, 69, "kiwi", "kiwis"),
  P(/\blemons?\b/, 58, "lemon"),
  P(/\bavocados?\b/, 136, "avocado"),
  P(/\bstrawberr(y|ies)\b/, 12, "strawberry", "strawberries"),
  P(/\bdates?\b/, 24, "Medjool date"),
  P(/\bfigs?\b/, 50, "fig"),
  P(/\bapricots?\b/, 35, "apricot"),
  P(/\bcarrots?\b/, 61, "carrot"),
  P(/\bcucumbers?\b/, 300, "cucumber"),
  P(/\b(spring|green) onions?\b|\bonions?, green\b|\bscallions?\b/, 15, "spring onion"),
  P(/\bonions?\b/, 110, "onion"),
  P(/\bgarlic\b/, 3, "clove"),
  P(/\b(bell|sweet) peppers?\b|^peppers?,? (sweet|green|red|yellow|raw)|^peppers?$/, 119, "pepper"),
  P(/\bzucchini|courgette/, 196, "zucchini", "zucchinis"),
  P(/\bmushrooms?\b/, 18, "mushroom"),
  P(/\bolives?\b/, 4, "olive"),
  P(/\bbagels?\b/, 98, "bagel"),
  P(/\bcroissants?\b/, 57, "croissant"),
  P(/\b(pita|pitta)\b/, 60, "pita"),
  P(/\btortillas?,? corn|\bcorn tortillas?/, 26, "tortilla"),
  P(/\b(tortilla|wrap)s?\b/, 49, "tortilla"),
  P(/\bcanadian bacon\b/, 23, "slice"),
  P(/\bvienna sausages?\b/, 16, "sausage"),
  P(/\b(toast|bread|baguette)\b/, 30, "slice"),
  P(/\bbacon\b/, 10, "slice"),
  P(/\b(cheddar|gouda|emmental|swiss|provolone|american cheese)\b/, 20, "slice"),
  P(/\bsausages?\b/, 50, "sausage"),
  P(/\bchicken,? drumsticks?/, 70, "drumstick"),
  P(/\brice cakes?\b/, 9, "rice cake"),
  P(/\bcookies?\b/, 15, "cookie"),
  P(/\b(donut|doughnut)s?\b/, 60, "donut"),
];

// Things that contain the word but are not the whole food, or come by the pot rather than the piece
const NOT_WHOLE = /\b(juice|sauce|paste|puree|powder|soup|ketchup|jam|jelly|flour|oil|dried|dehydrated|canned|pickled|chips|fries|salad|noodles?|pasta|crumbs|stuffing|pie|cake|muffin|pudding|substitute|spread|dressing|smoothie|milk|butter|seed|sandwich|burger|roll|rolls|bar|dip|filling|casserole|omelet|omelette|scramble|scrambled|fritter|pancake|waffle|bun|pizza|taco|burrito|stew|curry|sauteed|stir|mix|beverage|drink|shake|cocktail|ice cream|candy|syrup|extract|flavored|flavoured|imitation|dough|batter|leaves|baby food|infant|sprouts?|nectar|tapenade|holes|aspic|cereal|loaf|split|brownie|candied|glazed|scalloped|filled|iced)\b/;
/** Dishes: "X with Y", "X and Y", stuffed... The food itself comes first in the database name and is not part of a dish. */
const DISH = /\b(with|and|on|in|for|filled|style)\b|stuffed|scalloped|candied|glazed|brownie|mock/;
/** Words that may stand in front of the food ("Pork sausage", "Green banana", "Cherry tomatoes") */
const LEAD = /^(pork|turkey|beef|deer|lamb|chicken|italian|polish|canadian|green|red|yellow|sweet|bell|cherry|asian|baby|white|brown|wild|raw|fresh|whole|big|small)\s+/;

/**
 * Piece weight for a food name, or null when it is not counted by the piece.
 * `curated` is for our own short English names ("egg", "red onion"); database names ("Banana, raw", "Bread, banana", "Orange chicken", "Pepper steak") are judged by their first words so a dish is never mistaken for its main ingredient.
 */
export function pieceFor(name: string, curated = false): Piece | null {
  const n = name.toLowerCase().trim();
  if (NOT_WHOLE.test(n)) return null;
  if (curated) { for (const [re, p] of TABLE) if (re.test(n)) return p; return null; }
  const first = n.split(",")[0].trim();
  if (DISH.test(first) || /stuffed| and | on /.test(n)) return null;
  // "Egg, white only, raw" and "Egg, yolk only": the part comes after the comma
  if (/^egg, (white|yolk)/.test(n)) return /^egg, white/.test(n) ? TABLE[0][1] : TABLE[1][1];
  if (/^onions?, green/.test(n)) return { g: 15, one: "spring onion", many: "spring onions" };
  if (/^tortilla, corn/.test(n)) return { g: 26, one: "tortilla", many: "tortillas" };
  if (/^pepper, (hot|poblano|serrano|banana)/.test(n)) return null;
  for (const [re, p] of TABLE) {
    const m = re.exec(first);
    if (!m) continue;
    const before = first.slice(0, m.index).trim();
    const after = first.slice(m.index + m[0].length).trim();
    const okBefore = before === "" || LEAD.test(before + " ");
    const okAfter = after === "" || after === "fruit" || after === "nfs";
    if (okBefore && okAfter) return p;
  }
  return null;
}

export const plural = (p: Piece, n: number) => (n === 1 ? p.one : p.many);
