import { getBodyData } from "@/app/actions/body";
import { getTrainingStats } from "@/app/actions/training-stats";
import BodyHub from "@/components/BodyHub";
import { PageHeader } from "@/components/SectionHeaders";
import { requireOnboarded } from "@/lib/session";

export const metadata = { title: "Body" };

export default async function Body() {
  await requireOnboarded();
  const [data, stats] = await Promise.all([getBodyData(), getTrainingStats()]);
  return (
    <div>
      <PageHeader title="Body">Your weight, your measurements and your progress photos, the muscles you train and how strong you are getting.</PageHeader>
      <BodyHub data={data} stats={stats} />
    </div>
  );
}
