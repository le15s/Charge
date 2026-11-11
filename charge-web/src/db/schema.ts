import { relations, sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/* ---------- Better Auth tables ---------- */
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (t) => [index("session_user_idx").on(t.userId)]);

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("account_user_idx").on(t.userId)]);

// Better Auth keeps its sign-in / sign-up attempt counters here, so brute-force limits survive restarts and work across servers.
export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

/* ---------- App tables ---------- */
// One profile per user: onboarding answers + settings. Weights are always stored in kg, heights in cm.
export const profile = sqliteTable("profile", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  onboarded: integer("onboarded", { mode: "boolean" }).notNull().default(false),
  onboardingStep: integer("onboarding_step").notNull().default(sql`0`),
  displayName: text("display_name"),
  gender: text("gender"), // male | female | other
  birthYear: integer("birth_year"),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  goalWeightKg: real("goal_weight_kg"),
  goal: text("goal"), // muscle | lose | recomp | strength | maintain
  experience: text("experience"), // beginner | intermediate | advanced | expert. Worked out from trainingSince, so it rises on its own
  trainingSince: integer("training_since"), // ms timestamp: when they started training (their answer, counted back from the day they signed up)
  trainingTime: text("training_time"), // the answer they picked (see lib/level.ts), so the choice can be shown again
  levelNotice: text("level_notice"), // set when the level goes up; Home shows it once, then clears it
  heightUnit: text("height_unit").notNull().default("cm"), // cm | ft
  location: text("location"), // gym | home | both
  equipment: text("equipment", { mode: "json" }).$type<string[]>(), // dumbbells, bands, pullup_bar, bench, barbell, kettlebell, machines, cables
  daysPerWeek: integer("days_per_week"),
  sessionMinutes: integer("session_minutes"),
  activity: real("activity"), // 1.2 .. 1.725
  diet: text("diet"), // omni | veg | vegan
  injuries: text("injuries"), // free-text note; the structured answer is `limits`
  limits: text("limits", { mode: "json" }).$type<Record<string, "careful" | "avoid">>(), // body area -> careful | avoid (see lib/limits.ts)
  // settings
  units: text("units").notNull().default("kg"), // kg | lb
  restSeconds: integer("rest_seconds").notNull().default(90),
  tourDismissed: integer("tour_dismissed", { mode: "boolean" }).notNull().default(false),
  soundEnabled: integer("sound_enabled", { mode: "boolean" }).notNull().default(true),
  vibrationEnabled: integer("vibration_enabled", { mode: "boolean" }).notNull().default(true),
  soundVolume: integer("sound_volume").notNull().default(70), // 0..100
  keepAwake: integer("keep_awake", { mode: "boolean" }).notNull().default(true),
  // Rolling workout rotation: routine ids in order (may repeat, e.g. push, pull, legs, push). rotationPos = index of the next one.
  rotation: text("rotation", { mode: "json" }).$type<string[]>(),
  rotationPos: integer("rotation_pos").notNull().default(sql`0`),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const bodyWeight = sqliteTable("body_weight", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  day: text("day").notNull(), // YYYY-MM-DD
  weightKg: real("weight_kg").notNull(),
}, (t) => [index("bw_user_idx").on(t.userId, t.day)]);

/* Recipes people write themselves, in the Cooklang style (see lib/cooklang.ts). Everything else is worked out from the text. */
export const userRecipe = sqliteTable("user_recipe", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  servings: integer("servings").notNull().default(2),
  minutes: integer("minutes").notNull().default(30),
  meals: text("meals").notNull().default("ld"), // letters: b l d s
  text: text("text").notNull(),
  sourceUrl: text("source_url"), // set when it was imported from a web page
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [index("user_recipe_idx").on(t.userId)]);

/* The weekly meal planner: which recipe you plan to eat when. recipeId is a built-in recipe id, or "mine:<id>" for one you wrote. */
export const mealPlan = sqliteTable("meal_plan", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  day: text("day").notNull(), // YYYY-MM-DD
  meal: text("meal").notNull(), // b | l | d | s
  recipeId: text("recipe_id").notNull(),
  servings: integer("servings").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [index("meal_plan_idx").on(t.userId, t.day)]);

/* 5/3/1 style programme: training maxes in kg, which week of the four-week wave you are on, and how many cycles you have finished. */
export const waveState = sqliteTable("wave_state", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  squat: real("squat"), bench: real("bench"), deadlift: real("deadlift"), press: real("press"),
  week: integer("week").notNull().default(1),
  cycle: integer("cycle").notNull().default(1),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

/* Tape-measure numbers, one row per day. Lengths are stored in cm; any field can be left empty. */
export const bodyMeasure = sqliteTable("body_measure", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  day: text("day").notNull(), // YYYY-MM-DD
  waist: real("waist"), chest: real("chest"), hips: real("hips"), neck: real("neck"),
  shoulders: real("shoulders"), arm: real("arm"), thigh: real("thigh"), calf: real("calf"),
  bodyFat: real("body_fat"), // percent
}, (t) => [index("bm_user_idx").on(t.userId, t.day)]);

/* Private progress photos. Two small JPEGs (a thumbnail and a full-size one) are kept as data URLs and only served to their owner. */
export const progressPhoto = sqliteTable("progress_photo", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  day: text("day").notNull(), // YYYY-MM-DD
  pose: text("pose").notNull().default("front"), // front | side | back | other
  note: text("note"),
  thumb: text("thumb").notNull(),
  full: text("full").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [index("pp_user_idx").on(t.userId, t.day)]);

export const routine = sqliteTable("routine", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  source: text("source").notNull().default("manual"), // manual | assistant
  position: integer("position").notNull().default(sql`0`),
  plateColor: integer("plate_color"), // 0-15, the colour of this workout's plate; null = worked out from the order of creation
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [index("routine_user_idx").on(t.userId)]);

export const routineExercise = sqliteTable("routine_exercise", {
  id: text("id").primaryKey(),
  routineId: text("routine_id").notNull().references(() => routine.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id").notNull(), // id from free-exercise-db
  position: integer("position").notNull(),
  sets: integer("sets").notNull().default(3),
  repsMin: integer("reps_min").notNull().default(8),
  repsMax: integer("reps_max").notNull().default(12),
  restSeconds: integer("rest_seconds"),
}, (t) => [index("re_routine_idx").on(t.routineId)]);

export const workout = sqliteTable("workout", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  routineId: text("routine_id"),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // active | finished
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  notes: text("notes"),
}, (t) => [index("workout_user_idx").on(t.userId, t.startedAt)]);

export const workoutExercise = sqliteTable("workout_exercise", {
  id: text("id").primaryKey(),
  workoutId: text("workout_id").notNull().references(() => workout.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id").notNull(),
  position: integer("position").notNull(),
  restSeconds: integer("rest_seconds"),
  repsMin: integer("reps_min"),
  repsMax: integer("reps_max"),
  note: text("note"),
}, (t) => [index("we_workout_idx").on(t.workoutId)]);

export const workoutSet = sqliteTable("workout_set", {
  id: text("id").primaryKey(),
  workoutExerciseId: text("workout_exercise_id").notNull().references(() => workoutExercise.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  kind: text("kind").notNull().default("normal"), // normal | warmup | drop | failure
  weightKg: real("weight_kg"),
  reps: integer("reps"),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
}, (t) => [index("ws_we_idx").on(t.workoutExerciseId)]);

export const routineRelations = relations(routine, ({ many }) => ({ exercises: many(routineExercise) }));
export const routineExerciseRelations = relations(routineExercise, ({ one }) => ({ routine: one(routine, { fields: [routineExercise.routineId], references: [routine.id] }) }));
export const workoutRelations = relations(workout, ({ many }) => ({ exercises: many(workoutExercise) }));
export const workoutExerciseRelations = relations(workoutExercise, ({ one, many }) => ({ workout: one(workout, { fields: [workoutExercise.workoutId], references: [workout.id] }), sets: many(workoutSet) }));
export const workoutSetRelations = relations(workoutSet, ({ one }) => ({ exercise: one(workoutExercise, { fields: [workoutSet.workoutExerciseId], references: [workoutExercise.id] }) }));

/* Things the user keeps stocked: bars, whey, supplements... */
export const stockItem = sqliteTable("stock_item", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull().default("other"), // bar | protein | supplement | drink | other
  unit: text("unit").notNull().default("servings"),
  quantity: real("quantity").notNull().default(sql`0`), // amount on hand at quantityAt
  quantityAt: integer("quantity_at", { mode: "timestamp_ms" }).notNull(),
  perDay: real("per_day").notNull().default(1), // how much you use per day
  packSize: real("pack_size").notNull().default(30), // amount you get per order
  retailer: text("retailer").notNull().default("amazon"), // amazon | aliexpress | alibaba | other
  productUrl: text("product_url"),
  remindDaysBefore: integer("remind_days_before").notNull().default(7), // remind when this many days of stock are left
  repeatEveryDays: integer("repeat_every_days"), // optional fixed schedule (null = based on usage)
  nextOrderOn: text("next_order_on"), // YYYY-MM-DD, only with repeatEveryDays
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [index("stock_user_idx").on(t.userId)]);

/* Food diary */
export const foodLog = sqliteTable("food_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  day: text("day").notNull(), // YYYY-MM-DD in the user's local time
  meal: text("meal").notNull().default("snack"), // breakfast | lunch | dinner | snack
  name: text("name").notNull(),
  grams: real("grams").notNull(),
  kcal: real("kcal").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  menuItemId: text("menu_item_id"), // set when this row came from the user's daily menu
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [index("food_user_day_idx").on(t.userId, t.day)]);

/** The set menu: foods that land in your day by themselves (on the days you pick), so you only edit what changed. */
export const menuItem = sqliteTable("menu_item", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  meal: text("meal").notNull().default("snack"),
  name: text("name").notNull(),
  grams: real("grams").notNull(),
  kcal: real("kcal").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  days: integer("days").notNull().default(sql`127`), // bit 0 = Monday ... bit 6 = Sunday
  since: text("since").notNull(), // first day (YYYY-MM-DD) it applies to
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [index("menu_user_idx").on(t.userId)]);

/** Shopping list: things to buy, filled from recipes or typed in. Same ingredient twice = one line with the amounts added. */
export const shoppingItem = sqliteTable("shopping_item", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  ingredientId: text("ingredient_id"), // id from the ingredient list when we recognise it
  name: text("name").notNull(),
  grams: real("grams"), // null for things typed by hand
  aisle: text("aisle").notNull().default("Other"),
  note: text("note"), // "for Easy chicken curry"
  checked: integer("checked", { mode: "boolean" }).notNull().default(sql`0`),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [index("shopping_user_idx").on(t.userId)]);

/** Days the menu has already been dropped into the log, so a food you removed that day never comes back by itself. */
export const menuApplied = sqliteTable("menu_applied", {
  id: text("id").primaryKey(), // `${userId}:${day}`
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  day: text("day").notNull(),
});

/** Per-user kitchen: tools they have, spices they said yes or no to, menu on/off. Lists are JSON arrays of ids. */
export const kitchen = sqliteTable("kitchen", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  equipment: text("equipment").notNull().default(sql`'pot,pan,oven,microwave'`),
  haveSpices: text("have_spices").notNull().default(sql`''`),
  noSpices: text("no_spices").notNull().default(sql`''`),
  menuOn: integer("menu_on", { mode: "boolean" }).notNull().default(sql`1`),
  foodLang: text("food_lang").notNull().default(sql`'en'`), // language food names are shown in: en fr es ar de it pt tr
});

/** Foods the user adds themselves (a protein bar from the shop, mum's recipe...). Values are per 100 g. */
export const customFood = sqliteTable("custom_food", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kcal: real("kcal").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  servingGrams: real("serving_grams"), // e.g. one bar = 45 g
  barcode: text("barcode"), // set when the food came from a scan
  source: text("source"), // "off" = Open Food Facts (ODbL, needs credit)
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [index("custom_food_user_idx").on(t.userId)]);

/* Community: separate rooms, each with its own feed */
export const communityPost = sqliteTable("community_post", {
  id: text("id").primaryKey(),
  room: text("room").notNull(), // see src/lib/community.ts
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(), // username at the time of posting
  body: text("body").notNull(),
  replyToId: text("reply_to_id"),
  reports: integer("reports").notNull().default(sql`0`),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("community_room_idx").on(t.room, t.createdAt)]);

export const communityReport = sqliteTable("community_report", {
  postId: text("post_id").notNull().references(() => communityPost.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (t) => [index("community_report_idx").on(t.postId, t.userId)]);

/* Private chats: 1-on-1 and groups of up to 10 people */
export const chat = sqliteTable("chat", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(), // direct | group
  name: text("name"), // groups only
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  directKey: text("direct_key").unique(), // direct chats: "<smaller user id>:<larger user id>", so a pair only ever has one chat
  // what the chat list shows, kept up to date on every message
  lastMessageAt: integer("last_message_at", { mode: "timestamp_ms" }).notNull().default(sql`0`),
  lastBody: text("last_body"),
  lastAuthorId: text("last_author_id"),
  lastKind: text("last_kind"), // text | system
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("chat_last_idx").on(t.lastMessageAt)]);

export const chatMember = sqliteTable("chat_member", {
  chatId: text("chat_id").notNull().references(() => chat.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // owner | member
  joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
  lastReadAt: integer("last_read_at", { mode: "timestamp_ms" }).notNull().default(sql`0`), // 0 = never opened (shows as "new")
  clearedAt: integer("cleared_at", { mode: "timestamp_ms" }).notNull().default(sql`0`), // messages up to here are hidden for this person (deleted chat, or sent before they joined)
}, (t) => [primaryKey({ columns: [t.chatId, t.userId] }), index("chat_member_user_idx").on(t.userId)]);

export const chatMessage = sqliteTable("chat_message", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull().references(() => chat.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }), // who wrote it (for system lines: who did it)
  kind: text("kind").notNull().default("text"), // text | system
  body: text("body").notNull(),
  replyToId: text("reply_to_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("chat_msg_idx").on(t.chatId, t.createdAt)]);

export const chatBlock = sqliteTable("chat_block", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  blockedId: text("blocked_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.blockedId] })]);

/** A copy of what was reported, so it can be reviewed even if the message is deleted afterwards. */
export const chatReport = sqliteTable("chat_report", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  messageId: text("message_id").notNull(),
  authorId: text("author_id"),
  reporterId: text("reporter_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("chat_report_msg_idx").on(t.messageId, t.reporterId)]);

/* Playlist links the user opens in their own music app (Spotify, YouTube Music, Apple Music...). Charge never plays or stores the music. */
export const musicLink = sqliteTable("music_link", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  kind: text("kind").notNull().default("other"), // see lib/music.ts
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [index("music_link_user_idx").on(t.userId)]);
