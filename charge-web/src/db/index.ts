import { mkdirSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Local SQLite file in development; set DATABASE_URL (+ DATABASE_AUTH_TOKEN) to a Turso database in production.
const dbUrl = process.env.DATABASE_URL ?? "file:./data/local.db";
if (dbUrl.startsWith("file:") && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build" && process.env.VERCEL) {
  throw new Error("DATABASE_URL points to a local file, which does not persist on Vercel. Use a Turso database URL (libsql://...) and DATABASE_AUTH_TOKEN.");
}
if (dbUrl.startsWith("file:")) { try { mkdirSync("data", { recursive: true }); } catch {} }

const client = createClient({
  url: dbUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export { schema };
