import { db, schema } from "@/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const googleEnabled = googleConfigured;

const isRuntime = process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build";
if (isRuntime && (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.startsWith("change-me"))) {
  throw new Error("BETTER_AUTH_SECRET is not set. Add a long random string to your hosting environment variables.");
}
// Extra addresses people may reach the site on (for example both example.com and www.example.com).
const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL, ...trustedOrigins].filter((o): o is string => !!o),
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  socialProviders: googleConfigured
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } }
    : {},
  // On in production by default. Counters live in the database (not in memory) so they hold on serverless hosting.
  rateLimit: { storage: "database" },
  user: { deleteUser: { enabled: true } },
  plugins: [nextCookies()],
});
