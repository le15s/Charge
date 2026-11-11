// Creates any missing tables and indexes. Safe to run as often as you like: it never touches data that is already there.
// Local: file:./data/local.db. Production: set DATABASE_URL and DATABASE_AUTH_TOKEN (npm run db:push:prod does this from .env.production).
import { createClient } from "@libsql/client";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const url = process.env.DATABASE_URL ?? "file:./data/local.db";
if (url.startsWith("file:")) mkdirSync("data", { recursive: true });

const sql = execFileSync(process.execPath, ["node_modules/drizzle-kit/bin.cjs", "export", "--sql"], { encoding: "utf8", env: { ...process.env, DATABASE_URL: url }, stdio: ["ignore", "pipe", "inherit"] });
const statements = sql
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => s.replace(/^CREATE TABLE /i, "CREATE TABLE IF NOT EXISTS ").replace(/^CREATE (UNIQUE )?INDEX /i, "CREATE $1INDEX IF NOT EXISTS "));

const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
await client.batch(statements, "write");

// Columns added to a table in a later version: add them to tables that already exist (never touches data).
let added = 0;
for (const s of sql.split(/;\s*\n/)) {
  const m = s.match(/^CREATE TABLE `([^`]+)` \(([\s\S]*)\)\s*$/i);
  if (!m) continue;
  const table = m[1];
  const have = new Set((await client.execute(`PRAGMA table_info(\`${table}\`)`)).rows.map((r) => String(r.name)));
  for (const line of m[2].split(/,\s*\n/).map((l) => l.trim())) {
    const c = line.match(/^`([^`]+)`\s+(.*)$/);
    if (!c || /^(FOREIGN|PRIMARY|UNIQUE|CONSTRAINT)/i.test(line) || have.has(c[1])) continue;
    if (/PRIMARY KEY|UNIQUE/i.test(c[2]) || (/NOT NULL/i.test(c[2]) && !/DEFAULT/i.test(c[2]))) { console.warn(`Skipped adding ${table}.${c[1]}: it needs a default value.`); continue; }
    await client.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${line.replace(/,$/, "")}`);
    added++; console.log(`Added column ${table}.${c[1]}`);
  }
}
console.log(`Database is up to date (${statements.length} statements checked${added ? `, ${added} new column${added > 1 ? "s" : ""}` : ""}).`);
client.close();
