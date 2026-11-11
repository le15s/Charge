"use client";

import { sectionOf, type SectionId } from "@/lib/sections";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState } from "react";
import { AmbientDecor } from "./SectionDecor";
import NavProgress from "./NavProgress";

const Ctx = createContext<SectionId>("home");
export const useSection = () => useContext(Ctx);

/**
 * Wraps the whole signed-in app. It tells the CSS which section you are in (data-section),
 * and every colour, font and background below follows that, fading smoothly when you switch tabs.
 */
export default function SectionShell({ children }: { children: React.ReactNode }) {
  const section = sectionOf(usePathname() ?? "/");
  // Each time the section changes (not on first load) a coloured band wipes across the screen.
  const [last, setLast] = useState(section);
  const [swipes, setSwipes] = useState(0);
  if (last !== section) { setLast(section); setSwipes((n) => n + 1); }
  return (
    <Ctx.Provider value={section}>
      <div data-section={section} className="app-backdrop min-h-screen bg-body dark:bg-darkmode-body lg:flex">
        <NavProgress />
        {swipes > 0 && <div key={swipes} aria-hidden className="section-curtain" />}
        <AmbientDecor section={section} />
        {children}
      </div>
    </Ctx.Provider>
  );
}
