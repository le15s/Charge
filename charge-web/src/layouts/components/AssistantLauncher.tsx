"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FiMessageCircle, FiX } from "react-icons/fi";
import AssistantChat from "./AssistantChat";

export default function AssistantLauncher() {
  const pathname = usePathname();
  const inWorkout = pathname.startsWith("/workout/");
  // chat screens have their own send button in that corner
  const hide = /^\/(community\/.+|gyms)/.test(pathname);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const show = () => { setMounted(true); setOpen(true); };
    const hide = () => setOpen(false);
    window.addEventListener("open-assistant", show);
    window.addEventListener("close-assistant", hide);
    return () => { window.removeEventListener("open-assistant", show); window.removeEventListener("close-assistant", hide); };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {!open && !hide && (
        <button type="button" onClick={() => { setMounted(true); setOpen(true); }} aria-label="Open the workout assistant"
          className={`fixed right-4 z-40 flex items-center gap-2 rounded-full bg-primary py-3 font-semibold ${inWorkout ? "bottom-44 px-3 lg:bottom-28" : "bottom-20 px-5 lg:bottom-6"} text-white shadow-lg dark:bg-darkmode-primary dark:text-text-dark lg:right-6`}>
          <FiMessageCircle className="text-xl" /> {!inWorkout && "Assistant"}
        </button>
      )}
      {mounted && (
        <div className={open ? "fixed inset-0 z-50 flex justify-end bg-black/40" : "hidden"} onClick={() => setOpen(false)}>
          <aside role="dialog" aria-label="Workout assistant" onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col bg-body shadow-xl dark:bg-darkmode-body">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-darkmode-border">
              <div><h2 className="h5">Workout assistant</h2><p className="text-xs text-text-light dark:text-darkmode-text-light">Builds routines from your profile</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="p-2 text-xl"><FiX /></button>
            </div>
            <div className="min-h-0 grow"><AssistantChat /></div>
          </aside>
        </div>
      )}
    </>
  );
}
