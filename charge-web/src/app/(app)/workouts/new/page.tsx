import NewWorkoutForm from "@/components/NewWorkoutForm";
import { PageHeader } from "@/components/SectionHeaders";
import OpenAssistantButton from "@/components/OpenAssistantButton";

export const metadata = { title: "New workout" };

export default function NewWorkout() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New workout" tone="red">Name it, then add your exercises.</PageHeader>
      <NewWorkoutForm />
      <p className="mt-8 border-t border-border pt-6 dark:border-darkmode-border">Prefer a suggestion? <OpenAssistantButton className="font-semibold underline">Ask the assistant</OpenAssistantButton> to build it for you.</p>
    </div>
  );
}
