import { listChats } from "@/app/actions/chats";
import ChatShell from "@/components/ChatShell";
import { requireOnboarded } from "@/lib/session";

export const metadata = { title: "Messages" };

export default async function ChatsLayout({ children }: { children: React.ReactNode }) {
  await requireOnboarded();
  const chats = await listChats();
  return <ChatShell initial={chats}>{children}</ChatShell>;
}
