"use client";

import type { ChatSummary } from "@/app/actions/chats";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import ChatList from "./ChatList";
import CommunityTabs from "./CommunityTabs";

/** Messages screen: the chat list on the left, the open conversation on the right. On a phone only one of them shows at a time. */
export default function ChatShell({ initial, children }: { initial: ChatSummary[]; children: ReactNode }) {
  const path = usePathname();
  const m = path.match(/^\/community\/chats\/([^/]+)/);
  const activeId = m ? decodeURIComponent(m[1]) : null;
  return (
    <div>
      <div className={activeId ? "hidden lg:block" : ""}><CommunityTabs /></div>
      <div className="grid h-[calc(100dvh-13.5rem)] min-h-[420px] gap-5 lg:h-[calc(100dvh-12rem)] lg:grid-cols-[21rem_minmax(0,1fr)]">
        <aside aria-label="Conversations" className={`card min-h-0 p-4 ${activeId ? "hidden lg:block" : ""}`}><ChatList initial={initial} activeId={activeId} /></aside>
        <section className={`min-h-0 min-w-0 ${activeId ? "" : "hidden lg:block"}`}>{children}</section>
      </div>
    </div>
  );
}
