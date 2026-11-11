import { listPosts } from "@/app/actions/community";
import CommunityRoom from "@/components/CommunityRoom";
import { roomById } from "@/lib/community";
import { requireOnboarded } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function RoomPage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const r = roomById(room);
  if (!r) notFound();
  await requireOnboarded();
  const { posts, more } = await listPosts(room);
  return (
    <div>
      <Link href="/community" className="mb-3 inline-block text-sm font-semibold text-primary dark:text-darkmode-primary">‹ All rooms</Link>
      <div className="mb-5"><h1 className="h3">{r.title}</h1><p className="text-text-light dark:text-darkmode-text-light">{r.blurb}</p></div>
      <CommunityRoom room={r.id} hint={r.hint} initial={posts} initialMore={more} />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  return { title: roomById(room)?.title ?? "Community" };
}
