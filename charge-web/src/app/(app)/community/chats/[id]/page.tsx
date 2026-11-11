import { getChat } from "@/app/actions/chats";
import ChatView from "@/components/ChatView";
import { notFound } from "next/navigation";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chat = await getChat(id);
  if (!chat) notFound();
  // key = chat id, so moving from one chat to another starts fresh instead of reusing the old state
  return <ChatView key={chat.id} initial={chat} />;
}
