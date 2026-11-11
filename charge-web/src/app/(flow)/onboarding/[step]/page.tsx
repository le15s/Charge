import OnboardingStep from "@/components/OnboardingStep";
import { getProfile, requireUser } from "@/lib/session";
import { STEPS, type Step } from "@/lib/onboarding";
import { cleanLimits } from "@/lib/limits";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!STEPS.includes(step as Step)) notFound();
  const user = await requireUser();
  const p = await getProfile(user.id);
  const initial = {
    displayName: p.displayName ?? (user.name ?? "").replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 20),
    gender: p.gender, birthYear: p.birthYear, heightCm: p.heightCm, weightKg: p.weightKg, goalWeightKg: p.goalWeightKg,
    units: p.units, heightUnit: p.heightUnit, trainingTime: p.trainingTime, trainingSince: p.trainingSince, goal: p.goal, experience: p.experience, location: p.location, equipment: p.equipment ?? [],
    activity: p.activity, diet: p.diet, injuries: p.injuries, limits: cleanLimits(p.limits), onboarded: p.onboarded,
  };
  return <OnboardingStep step={step as Step} initial={initial} />;
}
