import { roomActivity } from "@/app/actions/community";
import CommunityTabs from "@/components/CommunityTabs";
import { PageHeader } from "@/components/SectionHeaders";
import { requireOnboarded } from "@/lib/session";
import { ROOMS } from "@/lib/community";
import Link from "next/link";

export const metadata = { title: "Community" };

export default async function Community() {
  await requireOnboarded();
  const activity = await roomActivity();
  return (
    <div>
      <PageHeader title="Community" tone="blue">Open a locker for a room everyone shares, or switch to Messages to chat privately with friends.</PageHeader>
      <CommunityTabs />
      <ul className="grid gap-x-5 gap-y-7 sm:grid-cols-2">
        {ROOMS.map((r, i) => (
          <li key={r.id} className="locker-wrap">
            <Link href={`/community/${r.id}`} className="locker group" data-tone={r.tone}>
              <span className="locker-vents" aria-hidden><i /><i /><i /><i /></span>
              <span className="locker-no" aria-hidden>№ {String(i + 1).padStart(2, "0")}</span>
              <span className="flex min-w-0 grow flex-col px-5 pb-5 pt-3">
                <span className="h4">{r.title}</span>
                <span className="mt-1 grow">{r.blurb}</span>
                <span className="mt-4 text-sm font-semibold text-primary dark:text-darkmode-primary">{activity[r.id] ? `${activity[r.id]} new message${activity[r.id] > 1 ? "s" : ""} today` : "Be the first to post today"}</span>
              </span>
              <span className="locker-handle" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-text-light dark:text-darkmode-text-light">Be kind and keep it about training. You can report a message and delete your own. Messages reported by three people are hidden.</p>
    </div>
  );
}
