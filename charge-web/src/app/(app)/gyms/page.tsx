import GymFinder from "@/components/GymFinder";
import { PageHeader } from "@/components/SectionHeaders";
import { requireOnboarded } from "@/lib/session";

export const metadata = { title: "Gym finder" };

export default async function GymsPage() {
  const { profile } = await requireOnboarded();
  return (
    <div>
      <PageHeader title="Gym finder">Every gym, studio and outdoor workout spot within 10 km, nearest first. Tap one for hours, directions and its Google Maps page.</PageHeader>
      <GymFinder imperial={profile.units === "lb"} />
    </div>
  );
}
