# Charge: workouts, food, stock and community

A real multi-page website (Next.js 16, React 19, Tailwind v4, Better Auth, Drizzle + SQLite/Turso) that also installs as a phone app.

## What's inside

- **Accounts**: username + email + password, optional "Continue with Google", log out, delete account.
- **Onboarding in 7 short steps**: about you (username, gender, birth year), body, goal, experience, where you train (**gym, home or both**), lifestyle, review. No schedule questions: Charge works out session size from your experience and learns from how long your workouts really take.
- **Home**: a barbell that gains plates as you train (red = push, blue = pull, yellow = legs), your **rolling rotation** with "Up next", reorder alerts, daily targets, and your **last 15 workouts**.
- **Workouts + assistant** (rule-based, tap only): pick a split, then a cycle (for example Push, Pull, Legs, Push; the next round continues with Pull). Tap any exercise to swap it. If you train in both places it asks gym or home per plan.
- **Tracker (Strong-style)**: weight/reps/notes, ✓ per set, warm-up/drop/failure sets, rest timer per exercise (±15 s, skip), **sound when you complete a set and when rest is over, vibration when it's time for the next set** (Android; iPhones don't allow websites to vibrate), screen stays on during a workout. Everything switchable in Settings.
- **Food**: search the USDA food list (about 7,000 foods, bundled, no API key), type "150 g chicken breast", log it to breakfast/lunch/dinner/snacks; calories and macros add up against your daily goal. Add your own foods from a label.
- **Stock**: bars, whey, supplements. Charge counts down your stock from your daily use, reminds you, and opens the shop page (Amazon, AliExpress, Alibaba or other) to reorder. Real auto-buying isn't possible: those shops have no API that lets a site buy from a normal customer's account (Amazon's Ordering API is for approved business accounts only).
- **Community**: four separate rooms (Website feedback, Questions, Tips and tricks, Lounge), replies, report and delete. Messages reported by 3 people are hidden. Set `ADMIN_EMAILS` to let admins delete any message. New in v5: **Chats**, one-to-one or groups of up to 10, with unread badges, read ticks, replies, block and report.
- **Gym finder** (new in v5): a map of every gym, studio, outdoor fitness spot, pool and supplement shop within 10 km of you, nearest first. Or switch to **Explore the world** and zoom into any city.
- **Phone app**: installable (Settings → Phone app). Android/desktop Chrome shows an Install button, iPhone: Share → Add to Home Screen.
- **History**, **Exercise library** (free-exercise-db, 870+ exercises), **Settings** (light/dark/system, kg/lb, rest time, sound/vibration, profile, log out, delete account).

## Run it locally

```bash
npm install
copy .env.example .env.local     # Mac/Linux: cp .env.example .env.local
npm run db:push                  # creates/updates the local SQLite database
npm run dev                      # http://localhost:3000
```

After updating to a new version, run `npm install` and then `npm run db:push` again so new packages and tables are added. `db:push` is safe to run as often as you like.

## Google sign-in (optional)

1. Google Cloud Console → APIs & Services → Credentials → *Create OAuth client ID* (Web application).
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (and your live URL + the same path).
3. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local` and restart.

## Put it online

SQLite files don't persist on serverless hosts, so use a free [Turso](https://turso.tech) database:

```bash
turso db create charge && turso db show charge --url && turso db tokens create charge
```

Set on your host: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` (your public https URL), `DATABASE_URL` (`libsql://…`), `DATABASE_AUTH_TOKEN`, optional Google variables and `ADMIN_EMAILS`. Run `npm run db:push` once with those variables, then `npm run build && npm start`. The phone app and service worker need **https** (every normal host provides it).

## Where things are

| What | Where |
| --- | --- |
| Pages | `src/app/(site)` landing, `(auth)`, `(flow)` onboarding, `(app)` home, workouts, tracker, food, stock, community, history, exercises, settings |
| Server actions | `src/app/actions/*` |
| Database | `src/db/schema.ts` |
| Splits, cycles, session size, swaps | `src/lib/splits.ts`, `src/lib/program.ts` |
| Sounds + vibration (synthesized, no audio files) | `src/lib/feedback.ts` |
| Food data + search | `src/data/foods.json`, `src/lib/foods.ts` |
| Stock maths + shop links | `src/lib/stock.ts` |
| Community rooms | `src/lib/community.ts` |
| Colours, fonts, look | `src/config/theme.json`, `src/styles/*` |
| Phone app | `src/app/manifest.ts`, `public/sw.js`, `public/icons/*` |

## Credits

Template base: [Nextplate](https://github.com/zeon-studio/nextplate) (MIT). Exercises: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense). Nutrition values: USDA Food and Nutrient Database for Dietary Studies (US government data, public domain), via the CORGIS "food" dataset ([corgis-edu/corgis](https://github.com/corgis-edu/corgis); the CORGIS code is GPL-3.0, the numbers come from the USDA); calories are computed from protein, carbs and fat. Fonts via Fontsource: Big Shoulders Display, Big Shoulders Stencil Display, Instrument Sans, Instrument Serif, Bricolage Grotesque and Space Grotesk (SIL Open Font Licence 1.1), Permanent Marker and Special Elite (Apache 2.0).


## v3 changes

- A set can only be checked once it has reps (and a weight, unless the move is bodyweight). Tapping the check early shakes the missing field. Clearing the weight or reps of a checked set takes the check off again. Tap the "Previous" numbers to copy them into the set.
- The check draws itself with a small burst when a set is completed.
- Every exercise name (in the library, in a workout and in the workout editor) opens a bottom sheet: description, how-to steps, muscles worked (main, medium, slight), and a History tab with a progress graph and your last 15 sets.
- Ready to go online: see `DEPLOY.md` (GitHub, Turso, Vercel and your own domain).

## v4 changes

- Cleaner surfaces: softer cards with a little depth, rounder inputs with a focus glow, and buttons that lift on hover and spring back when pressed.
- Weight-plate decor: faint plates drift behind every page, each page header has a plate stack and a plate peeking in from the corner, and section titles end in a small plate.
- Knurled-grip texture and a soft red glow behind the top of the app.
- Page changes: a thin loading bar at the top, then the page's blocks settle in one after another.
- Workout tracker: a progress bar for the workout, sets and exercises slide in and out, and the check draws itself with a burst.
- Finishing a workout shows a confetti shower in plate colours and a "Workout saved" banner.
- Sheets and dialogs slide or pop in, switches have a springy knob, and light/dark mode cross-fades.
- Everything switches off when the phone is set to "reduce motion".

## v5 changes

**A different feel for every section.** Each tab has its own colours, heading font, background and way of arriving: Workouts is a coach's whiteboard, Exercises an anatomy atlas, Food a market-stall menu, Stock a supply warehouse, Community a locker room, History a leather logbook, Settings a control panel, Gyms a street map.

**Chats.** Community now has a Messages tab. Start a chat with one person, or a group of up to 10 (you included). Search people by username. Chats update on their own every few seconds while the page is open, show unread counts, "sent / seen" ticks and replies, and you can add or remove people (the group owner), leave, block someone or report a message. New members only see messages from the moment they joined. Chat calls use a small API route (`/api/chat`) instead of Server Actions, so an open conversation never jumps around.

**Gym finder.** Open **Gyms** (under More on a phone). Everything is inside the app: an interactive map, a nearest-first list, filters (gyms, studios, outdoor, pools, shops, saved) and a detail card with address, opening hours, phone, website, "Directions" and "Google Maps" buttons.
- Data comes from OpenStreetMap through the free Overpass API. No API key and no cost. Coverage is very good in most cities, but small places can be missing or out of date.
- **Around me** limits the map to a 10 km circle around you (chips for 2, 5 and 10 km). **Explore the world** lifts that limit: zoom into any city (or search for it) and it lists the gyms in view.
- Your position is only used to ask for nearby places. It is kept in your own browser. To find places nearby, the exact position goes to this site's server, which asks the public Overpass servers using a position rounded to about 1 km (so nearby searches share one answer). Charge does not save it.
- Map pictures are the standard OpenStreetMap ones (free, no key; the usual light-use policy applies, with the credit shown on the map). At night the same pictures are darkened. (CARTO's free pictures now demand an API key, so v6 no longer uses them.) For a busy public site, get a key from a tile provider (MapTiler, Stadia, Mapbox...) and set `NEXT_PUBLIC_MAP_TILES_LIGHT`, `NEXT_PUBLIC_MAP_TILES_DARK` (optional) and `NEXT_PUBLIC_MAP_ATTRIBUTION`.
- **Place search** (a city or address) runs only when you press Enter or the search button, never while you type, because the free OpenStreetMap search server does not allow search-as-you-type and allows at most one request per second for the whole site (Charge queues and caches requests to stay under it).
- Optional settings: `OVERPASS_URL` (your own Overpass server), `NOMINATIM_URL` (place search server) and `CONTACT_URL` (your site or email, sent in the User-Agent as the OpenStreetMap and Open Food Facts servers ask).
- Google Maps data (star ratings, photos, reviews) is not shown inside the app because Google only provides it through a paid, key-based API and does not allow its map page to be embedded. The "Google Maps" button opens that place's own Google page in a new tab.

**Motion.** Switching tabs sweeps a band of the new section's colour across the screen; cards further down a page reveal as you scroll to them (browsers that support scroll-driven animation); list rows arrive one after another; cards that are links lift and press back; inputs glow in the section colour; text links draw their underline; pins on the map drop in; the "done" check, progress bar and rest timer all spring. All of it switches off with "reduce motion".

**Calmer workout screen.** The live workout page now uses warm sunset colours, rounded friendly type, thick tinted outlines around each exercise (a new colour per exercise, turning green when all its sets are done), rounded set rows, a gentle line of encouragement that follows your progress, and a breathing rest timer ring.

## v6 changes

Update steps: `npm install`, `npm run db:push` (adds the menu, kitchen and plate-colour tables/columns, never touches your data), `npm run dev`.

**Landing page.** "Workouts that roll" now cycles through push / pull / legs, upper / lower, full body, bro split and a mixed set, then shows "or even create one yourself!" and loops back to push / pull / legs.

**Plate colours.** Every workout (yours or one from the site) has its own barbell plate colour (16 colours, shown in the Workouts list and on the routine page, changeable). Finish a workout and its plate slides onto the barbell under "Hi, username".

**Gym map fix.** The map used CARTO tiles, which now answer "API key required". It now uses the standard OpenStreetMap tiles (free, no key), darkened at night. See the v5 notes for using your own tile provider.

**Food page: three tabs.**
- **Today**: totals plus a *Quick add* card (your usual foods, one tap to log, with Undo), *Type a whole meal* (`2 eggs, rice 200 g, chicken breast 150` finds each food and its amount at once), *Copy yesterday*. Every food you add can be **Just today** or **Every day**.
- **My menu**: the foods you eat on a normal day. They drop into each day by themselves, on the weekdays you pick (M T W T F S S buttons). On any day tap ⋯ → *Didn't eat it today* (only that day) or *Take it off my menu*. Edit grams, pause the whole menu, or build it from what you logged today. A food you remove from a day never comes back by itself.
- **Recipes**: type what you have (any of 8 languages, a whole comma list works, unknown words are kept and ignored). 108 recipes, ranked for *your goal* (losing weight: lighter and higher in protein first; muscle/strength: high protein and enough calories first; otherwise balanced). Filters: meal, time (quick ≤ 30 min / any / "I have time" ≥ 60 min), vegetarian, vegan, pescatarian, halal, gluten-free, dairy-free, nut-free, and "only what I have / up to 1 / up to 2 missing". **My kitchen** lists the tools you own (pot, pan, oven, microwave, blender, rice cooker, air fryer, grill, toaster): recipes needing something you don't have are hidden (with a "show anyway" button). Salt, pepper, water and cooking oil are assumed. When you open a recipe it asks about the non-obvious things ("curry powder?", "paprika?"), remembers the answers, and suggests a stand-in when you say no. Nutrition per serving is worked out from the ingredients you actually have; one tap logs a serving.
- **Languages**: food names and search work in English, French, Spanish, Arabic, German, Italian, Portuguese and Turkish (pick "Food names in" at the top right; you can always search in any of them). The rest of the interface stays English.
- **Many more foods**: about 400 dishes and foods from the Maghreb, the Middle East, Turkey, the Caucasus and Persia, Europe, India and Pakistan, East and South-East Asia, Africa and Latin America (couscous royal, rfissa, lablabi, lahmacun, injera, doro wat, pozole, ají de gallina…), 260 recipe ingredients, plus the USDA list as before.

**Open data.** I looked for existing open recipe data on GitHub first. Nothing was usable as is: jakevdp/open-recipe-data (CC BY, scraped and unstructured), TheMealDB (its free key is meant for development and education; releasing a public app on an app store needs a paid supporter key), IndicRecipeNutri-dataset (CC BY-NC-SA, non-commercial, no instructions) and CJStandingwater/Cookbook (MIT, nicely structured but only a handful of recipes). So the recipes are original, written for Charge, in `src/data/recipes.ts`; ingredient nutrition and the 8-language names are in `src/data/ingredients.ts`; world dishes in `src/data/worldfoods.ts`. All are plain text tables, easy to extend. Nutrition values are estimates.

**Where things are (food).** `src/lib/food-index.ts` (search in 8 languages), `src/lib/recipes.ts` (matching, ranking, equipment, diets), `src/app/actions/food.ts` (log, menu, kitchen), components `FoodHub`, `FoodTracker`, `MenuManager`, `RecipeFinder`, `AddFoodSheet`. New tables: `menu_item`, `menu_applied`, `kitchen`; new column `food_log.menu_item_id`.

## v7 and v8 changes

Update steps: `npm install` (adds `@zxing/browser` and `@zxing/library` for the barcode scanner), `npm run db:push` (new tables and columns, never touches your data), `npm run dev`.

**Workouts**
- **Plate calculator and progression.** Barbell moves have a *Plates* button in the workout that shows which plates go on each side of the bar (set which plates you own). After a session the app suggests what to try next time: more weight once every set hits the top of the rep range, stay put otherwise, ease off if it looked too heavy, and a **deload** (about 10% lighter) when the last three sessions showed no gain.
- **Programs.** Ready-made programs in *Programs*: Starting Strength style, GZCLP style, 5/3/1, Push/Pull/Legs and Upper/Lower. Any routine or program can be shared with a link and copied by someone else.
- **Exercise extras.** Equipment, level, mechanic, force and the muscles come from free-exercise-db itself. On top of that, 79 exercises also show "variation of" links, a one-line description, a demo-video link, other names or tips taken from the exercemus/exercises data (its code is MIT; its data says nothing different for these items. The one exercise there that carries a CC-BY-SA licence is left out). Most exercises have no extras: that data simply does not exist for them.
- **Recovery and rotation (the important one).** `src/lib/recovery.ts` gives each routine a muscle load (1 per hard set for the main muscle, 0.2 for helpers). A muscle that was hit hard stays "recovering" for 48 h (big muscles), 36 h (arms) or 24 h (small ones). The Workouts page shows a *recovering* chip, the time since you last did each workout ("2 days ago"), and a warning when two workouts in a row train the same muscle (the "Up next" card on Home shows last-done and recovery too), including the wrap from the last workout of the cycle back to the first.
- **Splits.** `src/lib/splits.ts` has Push/Pull/Legs (3 or 6 days), Upper/Lower (2 or 4), Full body (2 or 3, flagged as needing a rest day between), Bro split (4 or 5), and PPL + Upper/Lower. The old Push-Pull-Legs-Push 4-day cycle is gone: a 4-day plan now uses Upper/Lower or a split whose neighbours never overlap. `npx tsx` over every split, goal, level and equipment finds no clashes.
- **Assistant.** After a plan it asks how much time you have, for each workout or all, and trims or adds exercises and sets to fit ("about 55 min"). Choices are stacked at the same width. Goal (muscle, strength, fat loss, general) now changes sets, reps and rest.
- **Inputs and sounds.** Weight and reps accept only numbers (and `-`). Each action has its own sound: add set, remove set, tick, untick, timer +15 / -15, skip, finish. Sounds and vibration each have their own setting.
- **History.** Exercise names and their numbers sit close together and are bigger.

**Body**
- **Photos and measures**, **muscle map** (front and back figure, last 7 or 30 days, shaded by sets) and **strength graphs** (best estimated 1-rep max per lift, also as a multiple of bodyweight).
- **Quick weight.** The scale chip at the top of every page (sidebar on desktop, header on phone) and a "Change weight" button on Home open the same small sheet.

**Levels**
- Sign-up asks how long you have trained: under 6 months, 6 months to 2 years, 2 to 5 years, more than 5 years. That gives **four levels**: beginner, intermediate, advanced, expert (expert plans use the advanced engine). Four because the 2 to 5 and 5+ groups need different volume. The level rises on its own as the months pass and Home shows a one-time "you levelled up" card. Older accounts are filled in from their old level.

**Settings** are split into two tabs: *Personal info* (name, body, goal, level, injuries) and *App settings* (username, password, units including height in cm or ft/in, sound, vibration, theme, delete account). The tab is in the address (`?tab=app`).

**Food**
- **Shopping list.** Add items by typing or from a recipe or the week plan, grouped by shop aisle. "I bought these" moves them into what you have, so the recipe finder knows.
- **Barcode scan** (camera, or type the number) looks the product up in Open Food Facts (ODbL, credit shown). Set `OFF_URL` to use another server. Unknown barcodes can be saved as your own food.
- **Log by piece.** Eggs, bananas, apples, bread slices, tomatoes and about 40 more foods ask "How many?" with a stepper (halves allowed) instead of grams; "In grams" is one tap away. Typing `2 eggs, 1 banana, 2 slices bread` works too. Weights per piece are in `src/lib/pieces.ts`.
- **Search order.** Everyday foods come first ("boiled" gives egg and potato, not goat); cooking words alone no longer match odd dishes.
- **Cookbook and cook mode.** Write recipes in Cooklang (`@eggs{2}`, `~{10%minutes}`), get nutrition, scale servings, and cook step by step with timers (screen kept awake).
- **Import from a link** reads a recipe page. Private addresses are blocked unless `ALLOW_PRIVATE_FETCH=1`, which is only for local tests.
- **Week plan.** Put recipes on meals, see the calories add up, log a planned meal, and send everything you need to the shopping list.

**Stock.** Tap a type (Whey protein, Creatine...) and its name shows faded in the Name box. Type a name and yours is used; leave it empty and the type becomes the name.

**Community.** It reopens on the tab you left, Rooms or Messages.

**Exercises.** No "Show more" button: the next 30 load by themselves as you near the bottom.

Credits for this version: [Open Food Facts](https://world.openfoodfacts.org) (ODbL), [exercemus/exercises](https://github.com/exercemus/exercises) (MIT), [Cooklang](https://cooklang.org) (spec).

## v9: fact-check, licences, North African recipes

Update steps: none needed (no new packages, no database change). Optional: set `CONTACT_URL` (see `.env.example`).

**What was checked, and what changed**
- **Ingredient nutrition.** Every row's calories were checked against its protein, carbs and fat (4/4/9), and values that looked off were compared with USDA or label figures. Wrong values, serving weights, diet flags (meat, fish, dairy, gluten, nuts, alcohol…) and translations were corrected. Examples: stock cubes and miso now count as gluten, curry paste as shellfish, chicken stock as meat. Rows I could not confirm from a source remain estimates, for example dried nori and the goat and sausage rows.
- **"Count by piece" weights** ("2 eggs", "1 banana"): rewritten on USDA medium-size portions, and run against every USDA name so dishes ("Orange chicken", "Egg roll") are never mistaken for the fruit or egg.
- **Training rules.** The formulas (Epley 1RM, +2.5 kg step, 8% deload guard, 5/3/1 weeks, GZCLP, Starting Strength) were re-read. The recovery times are now worded as a rule of thumb (about 48 h for big muscles; people differ) instead of a fact. The Starting Strength program says it is a simplified version.
- **Recipes (127).** Calories per serving and grams per serving were recomputed for every recipe and all fit normal meals. Diet filters were re-run against the changed flags: jollof rice now accepts vegetable stock, and the oat balls accept maple syrup, so vegetarians and vegans can make them.
- **Licences and credits.** Checked against the sources: free-exercise-db is Unlicense; exercemus code is MIT but its data carries a licence per exercise, so only the entries without one are used and the single CC-BY-SA item is left out; Open Food Facts data is ODbL (images CC BY-SA, which Charge does not use); USDA data is public domain; fonts are OFL or Apache 2.0 (all eight are now listed). The "Exercise extras" claim was too big and is fixed: only 79 exercises have extras.
- **OpenStreetMap rules.** The place search used to fire while you typed, which the public Nominatim server does not allow. It now runs on Enter or the search button. The User-Agent now carries a contact (`CONTACT_URL`). The text about your position was corrected: it is sent to the server to find places (not saved).
- **Not verified:** the muscle tags of the 895 exercises come from free-exercise-db as they are. A scripted check found a few questionable ones (for example "Side Leg Raises" is tagged adductors). World-dish values (about 400 rows) are estimates from typical recipes, checked for calorie consistency but not against a lab source.

**New**
- **19 North African recipes** (Morocco, Tunisia, Algeria, Egypt): harira, lablabi, brik, ojja merguez, mechouia, zaalouk, carrot and beetroot salads, orange and cinnamon, baghrir, vegetable tagine, chermoula fish, harissa chicken, merguez couscous, chorba, lamb couscous, red lentil soup, hawawshi and sayadeya. They are original texts written for Charge.
- **Your data.** Settings, "Your data": download everything as JSON, or all your sets as CSV for a spreadsheet. Progress photos, chat and community posts are not included.

**Compared with other open-source apps** (wger, Liftosaur, OpenNutriTracker, Mealie, Tandoor…): the roadmap features are all in. Ideas used from them: shopping list from recipes, plate calculator and progression, programs, barcode lookup, recipe import, cook mode. Data used from them: free-exercise-db, exercemus extras, Open Food Facts, USDA. Not built yet: supersets, RPE/RIR logging, water and fasting trackers, importing history from other apps.

## v11: polish and safety for the public site

Update steps: `npm install`, `npm run db:push` (new table `rate_limit`, existing data is untouched), then `npm run dev`. On the real site run `npm run db:push:prod` before deploying.

- **Sign-in protection.** After 3 wrong sign-in or sign-up attempts in 10 seconds from one address, the site answers "too many requests" for a moment. The counters are kept in the database, so this also works on Vercel. It only runs in production mode (`npm run build` then `npm start`, or on the live site), not in `npm run dev`.
- **Browser security headers** (in `next.config.mjs`): no content sniffing, no embedding in other sites, a safe referrer, HTTPS only, and location/camera allowed for this site only. A full Content-Security-Policy is not added yet: it must be tested against every map, font and image source first.
- **Readability.** Secondary grey text is darker (4.5:1 contrast or better on every tinted card), the green and blue section colours are darker, and dark mode no longer shows dim text where a component forgot its dark colour.
- **Motion.** No bouncy easing, no `transition: all`, and hover effects only on devices that can hover (so phones don't get stuck "hovered").
- **Speed.** Independent database reads on the history, settings, workout and routine pages now run together, and the Food tabs (recipes, week plan, my menu, shopping, my recipes) load their code only when opened (about 120 kB less JavaScript on first load of Food).
- Sidebars have names for screen readers.

## v10: goals, goal checks, new home page, 3D body, gyms fix

Update steps: `npm install` (new package: `three`), `npm run db:push` (new table `music_link`, existing data is untouched), then `npm run dev`.

**Goals and workouts**
- **Six goals** (build muscle, get stronger, lose fat, recomposition, stay in shape, **build endurance**). The numbers for each one (reps, rest, sets, session length, weekly sets, calories, protein, carbs) live in one file, `src/lib/goals.ts`, and the assistant, the workout check and the food check all read it, so they always agree.
- **The assistant builds different workouts for each goal** (heavy low-rep main lifts for strength, 12 to 25 reps and short rests for endurance, and so on).
- **No two plans are the same.** Each request mixes a per-user number with a fresh random one, picks between equally good rep/rest variants, and swaps in similar exercises. Two plans for the same person share most of the structure but not every exercise.

**Goal check (warnings and advice)**
- Every workout is checked against your goal and level: in the routine editor, in the assistant's proposal, and on *My workouts* (a chip on each card and a summary). It looks at reps, rest, sets, session length, weekly sets per muscle, push/pull balance, missing muscles and exercise order, and says what to change. Example: a 25-rep, 30-second-rest workout is flagged when your goal is to build muscle.
- **Food check** on the Food page: the day and the 7-day average against your calories, protein and carbs, with ideas that fit what you already eat (portions kept realistic), plus a weight-trend note.
- Honest limits: these are guidelines for healthy adults, not medical advice. The food-quality part is a keyword check, there is no fibre data, and the references in `goals.ts` were summarised, not re-checked paper by paper.

**New home page and sign-in/sign-up**
- Home: a hero where you pick a goal and the sample workout rebuilds itself with the numbers the app really uses, a before/after demo of the goal check, quick facts (exercise, recipe and goal counts come from the data), and scroll-in sections. All of it respects "reduce motion", light/dark and phones.
- Sign-in and sign-up: two panels, a bar that gets a plate for every field you fill in correctly, inline messages instead of one error, show/hide password, strength bar, Caps Lock hint, focus goes to the first problem. Field names and routes are unchanged.
- Fixed: on the first onboarding step, "That username is taken" was hidden behind a generic message.

**Body tab: 3D**
- The muscle map is now a 3D body (three.js, drawn from simple shapes, no model file) that you can drag, flick, turn with the arrow buttons or keys, jump to front/back, or let swing. Tap a muscle to see its sets. It only draws while it moves. Without WebGL it falls back to the flat drawing.

**Gyms fix**
- Overpass answers "200 OK" with an empty list when a query runs out of time. The app read that as "no gyms" and cached it for ten minutes. A timeout is now an error, the next mirror is tried, the query uses a bounding box (much cheaper for Overpass) and is split so pools, studios and shops can never block the main list. `OVERPASS_URL` can hold several comma-separated servers. Tested with a mock server only (the build sandbox cannot reach the public Overpass servers), so check it once on your own connection.

**Music launcher**
- Settings → App settings → *Music*: save links to your playlists (Spotify, YouTube Music, Apple Music, Deezer, SoundCloud, Anghami, Tidal, Amazon Music, Audiomack or any https link; up to 20). In a workout, the **♪ Music** button opens them in your own music app with one tap.
- Charge plays and stores no music. Your music app does the playing, so background play, lock-screen controls and offline downloads work as that app provides them. Only `https://` links to real websites are accepted.
- Why not a built-in player: YouTube's developer policies forbid background or audio-only playback, and copying a whole library into a browser is impractical. Not tested on a real phone: how each service's link opens in its app (usually straight into the installed app), and whether your phone keeps Charge's rest alert alive while the music app is in front.

**Console warnings fixed**
- React's "key in spread props" warning (muscle drawing) and Next's smooth-scroll notice (`data-scroll-behavior` on `<html>`).

Credits for this version: [three.js](https://threejs.org) (MIT).

**v12: sign-up answers now matter, calmer Workouts tab**
- New sign-up step "Pain and injuries" (neck, shoulders, elbows/wrists, lower back, hips, knees, ankles: Fine / Be careful / Avoid). Also editable in Settings. The assistant and exercise swaps never pick exercises that clash; routines you build yourself get a warning in the goal check. The free-text injury note is stored, not read by the app.
- Diet now pre-selects the recipe finder filters; goal weight now feeds the weekly food check.
- Workouts tab redesigned to look like a gym board (plate dot, uppercase titles, "Up next", about-N-min). The rest of the site: lighter hover/decor.
- Run `npm run db:push` after updating (new column `profile.limits`).
- The injuries panel is a grid of tiles: tap a tile to cycle Fine, Careful, Avoid (colour bar and dot show the state).
- Smoother motion: sign-up steps and the injury tiles use a softer ease-out curve (all under 0.3 s), and buttons ease with the same curve as the rest of the site, and the scroll-reveal of cards is switched off for people who ask their device for reduced motion.
- Small fixes: the "Workout in progress" bar is now a labelled region for screen readers, and the community tab text colour is a touch darker so it passes the contrast minimum.
- Exercise matching is by name rules, so it is a guide, not medical advice.
