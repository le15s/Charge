import { listMusic } from "@/lib/music-db";
import SettingsPanel from "@/components/SettingsPanel";
import { PageHeader } from "@/components/SectionHeaders";
import { db } from "@/db";
import { account } from "@/db/schema";
import { EQUIPMENT_OPTIONS } from "@/lib/program";
import { requireOnboarded } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { cleanLimits } from "@/lib/limits";

export const metadata = { title: "Settings" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { user, profile: p } = await requireOnboarded();
  const [[cred], music] = await Promise.all([
    db.select({ id: account.id }).from(account).where(and(eq(account.userId, user.id), eq(account.providerId, "credential"))),
    listMusic(user.id),
  ]);
  return (
    <div>
      <PageHeader title="Settings" tone="steel">Your personal info, and how the app works for you.</PageHeader>
      <SettingsPanel
        music={music}
        email={user.email}
        hasPassword={!!cred}
        initialTab={tab === "app" ? "app" : "personal"}
        equipmentOptions={EQUIPMENT_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
        p={{
          displayName: p.displayName ?? user.name ?? "", gender: p.gender ?? "male", birthYear: p.birthYear, heightCm: p.heightCm, weightKg: p.weightKg,
          goal: p.goal ?? "muscle", experience: p.experience ?? "beginner", trainingTime: p.trainingTime ?? "lt6", trainingSince: p.trainingSince, heightUnit: p.heightUnit, goalWeightKg: p.goalWeightKg, injuries: p.injuries ?? "", limits: cleanLimits(p.limits), location: p.location ?? "gym", equipment: p.equipment ?? [],
          activity: p.activity ?? 1.375, diet: p.diet ?? "omni",
          units: p.units, restSeconds: p.restSeconds, soundEnabled: p.soundEnabled, vibrationEnabled: p.vibrationEnabled, soundVolume: p.soundVolume, keepAwake: p.keepAwake,
        }}
      />
    </div>
  );
}
