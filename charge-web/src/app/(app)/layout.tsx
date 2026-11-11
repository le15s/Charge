import AssistantLauncher from "@/components/AssistantLauncher";
import { PlateMark } from "@/components/Decor";
import Logo from "@/components/Logo";
import SectionShell from "@/components/SectionShell";
import QuickWeight, { WeightButton } from "@/components/QuickWeight";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { BottomNav, SideNav } from "@/components/AppNav";
import { db } from "@/db";
import { bodyWeight, workout } from "@/db/schema";
import { requireOnboarded } from "@/lib/session";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireOnboarded();
  const [active] = await db.select().from(workout).where(and(eq(workout.userId, user.id), eq(workout.status, "active"))).orderBy(desc(workout.startedAt)).limit(1);
  const [lastW] = await db.select({ day: bodyWeight.day }).from(bodyWeight).where(eq(bodyWeight.userId, user.id)).orderBy(desc(bodyWeight.day)).limit(1);
  const units = profile.units === "lb" ? "lb" : "kg";
  return (
    <SectionShell>
      <aside aria-label="Sidebar" className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-card p-5 dark:border-darkmode-border dark:bg-darkmode-card lg:flex">
        <PlateMark tone="accent" className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 opacity-[0.07] dark:opacity-[0.10]" />
        <div className="relative mb-8"><Logo /></div>
        <div className="relative"><SideNav /></div>
        <div className="relative mt-5"><WeightButton units={units} kg={profile.weightKg} /></div>
        <div className="relative mt-auto flex items-center justify-between gap-2 pt-6">
          <div className="min-w-0"><p className="truncate font-semibold text-text-dark dark:text-darkmode-text-dark">@{profile.displayName ?? user.name}</p><p className="truncate text-sm text-text-light dark:text-darkmode-text-light">{user.email}</p></div>
          <ThemeSwitcher />
        </div>
      </aside>
      <div className="min-w-0 grow">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur dark:border-darkmode-border dark:bg-darkmode-card/95 lg:hidden">
          <Logo /><div className="flex items-center gap-2"><WeightButton units={units} kg={profile.weightKg} /><ThemeSwitcher /></div>
        </header>
        {active && (
          <div role="region" aria-label="Workout in progress" className="bg-primary text-[color:var(--sk-ink)] dark:bg-darkmode-primary">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 text-sm font-medium">
              <span>Workout in progress: {active.name}</span>
              <Link href={`/workout/${active.id}`} className="underline">Resume</Link>
            </div>
          </div>
        )}
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 lg:pb-12 lg:pt-10">{children}</main>
      </div>
      <BottomNav />
      <QuickWeight units={units} kg={profile.weightKg} lastDay={lastW?.day ?? null} />
      <AssistantLauncher />
    </SectionShell>
  );
}
