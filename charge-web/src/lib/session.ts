import { auth } from "@/lib/auth";
import { db } from "@/db";
import { profile } from "@/db/schema";
import { levelFor } from "@/lib/level";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export const getProfile = cache(async (userId: string) => {
  const [p0] = await db.select().from(profile).where(eq(profile.userId, userId));
  let p = p0;
  // the level follows how long they have been training, so it goes up by itself
  // accounts from before levels followed time: start the clock from the level they chose, without a "level up" message
  if (p?.onboarded && p.trainingSince == null && p.experience) {
    const tt = p.experience === "intermediate" ? { id: "6to24", m: 12 } : p.experience === "advanced" || p.experience === "expert" ? { id: "2to5", m: 36 } : { id: "lt6", m: 3 };
    const since = Date.now() - tt.m * 30.44 * 86_400_000;
    await db.update(profile).set({ trainingSince: since, trainingTime: tt.id }).where(eq(profile.userId, userId));
    p = { ...p, trainingSince: since, trainingTime: tt.id };
  }
  if (p?.onboarded && p.trainingSince != null) {
    const lvl = levelFor(p.trainingSince);
    if (lvl !== p.experience) {
      const up = p.experience != null; // a first-time value is not a "level up"
      await db.update(profile).set({ experience: lvl, ...(up ? { levelNotice: lvl } : {}) }).where(eq(profile.userId, userId));
      p = { ...p, experience: lvl, levelNotice: up ? lvl : p.levelNotice };
    }
  }
  if (p) return p;
  await db.insert(profile).values({ userId }).onConflictDoNothing();
  const [created] = await db.select().from(profile).where(eq(profile.userId, userId));
  return created;
});

/** For pages that need a signed-in user (does not require onboarding). */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

/** For app pages: signed in and onboarding finished. */
export async function requireOnboarded() {
  const user = await requireUser();
  const p = await getProfile(user.id);
  if (!p.onboarded) redirect("/onboarding");
  return { user, profile: p };
}
