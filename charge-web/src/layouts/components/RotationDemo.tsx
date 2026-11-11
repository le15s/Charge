"use client";

import { plateInkClass, plateVar } from "@/lib/plates";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { FiEdit3 } from "react-icons/fi";

type Step = { name: string; color: number };
type Group = { id: string; label: string; steps: Step[]; blurb: string; custom?: boolean };

/** The ready-made splits, one after another, then "make your own", then back to the start. */
const GROUPS: Group[] = [
  { id: "ppl", label: "Push / Pull / Legs", blurb: "Group muscles by movement.", steps: [{ name: "Push", color: 0 }, { name: "Pull", color: 1 }, { name: "Legs", color: 2 }, { name: "Push", color: 0 }] },
  { id: "ul", label: "Upper / Lower", blurb: "Alternate the top and the bottom of your body.", steps: [{ name: "Upper A", color: 4 }, { name: "Lower A", color: 3 }, { name: "Upper B", color: 5 }, { name: "Lower B", color: 6 }] },
  { id: "fb", label: "Full body", blurb: "Train everything every time. Perfect for beginners and busy weeks.", steps: [{ name: "Full body A", color: 7 }, { name: "Full body B", color: 10 }, { name: "Full body C", color: 11 }] },
  { id: "bp", label: "Body-part split", blurb: "One or two muscle groups per session.", steps: [{ name: "Chest", color: 13 }, { name: "Back", color: 1 }, { name: "Shoulders", color: 8 }, { name: "Arms", color: 9 }, { name: "Legs", color: 2 }] },
  { id: "mix", label: "PPL + Upper / Lower", blurb: "Five sessions that mix both ideas.", steps: [{ name: "Push", color: 0 }, { name: "Pull", color: 1 }, { name: "Legs", color: 2 }, { name: "Upper", color: 4 }, { name: "Lower", color: 3 }] },
  { id: "own", label: "Your own", custom: true, blurb: "Pick any exercises, name it, give it a colour. Or let the assistant suggest one.", steps: [{ name: "Your workout", color: 14 }, { name: "Another one", color: 15 }, { name: "or even create one yourself!", color: 12 }] },
];
const STEP_MS = 1300;

/** Shows the rolling cycle: finish one workout, the next lights up; after the last one the next split begins, and in the end it loops back. */
export default function RotationDemo() {
  const [g, setG] = useState(0);
  const [i, setI] = useState(0);
  const hold = useRef(0); // while someone is poking at it, don't auto-advance
  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() < hold.current) return;
      setI((c) => {
        if (c < GROUPS[g].steps.length - 1) return c + 1;
        setG((x) => (x + 1) % GROUPS.length);
        return 0;
      });
    }, STEP_MS);
    return () => clearInterval(t);
  }, [g]);
  const group = GROUPS[g];
  const step = group.steps[Math.min(i, group.steps.length - 1)];
  const isCreate = group.custom && i === group.steps.length - 1;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Kinds of rotation">
        {GROUPS.map((x, idx) => (
          <button key={x.id} type="button" role="tab" aria-selected={idx === g} onClick={() => { hold.current = Date.now() + 7000; setG(idx); setI(0); }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${idx === g ? "bg-text-dark text-white dark:bg-darkmode-text-dark dark:text-text-dark" : "bg-light text-text-light hover:text-text-dark dark:bg-darkmode-light dark:text-darkmode-text-light dark:hover:text-darkmode-text-dark"}`}>{x.custom ? "Make your own" : x.label}</button>
        ))}
      </div>

      <div className="min-h-[7.5rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.ol key={group.id} className="flex flex-wrap items-center gap-2" aria-label={`Example rotation: ${group.label}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28, ease: "easeOut" }}>
            {group.steps.map((s, idx) => {
              const on = idx === i, create = group.custom && idx === group.steps.length - 1;
              return (
                <li key={idx} className="flex items-center gap-2">
                  <motion.span layout animate={{ scale: on ? 1.08 : 1 }} className={`relative z-10 flex items-center gap-2 rounded-full px-4 py-2 font-semibold transition-colors duration-300 ${create ? `border-2 border-dashed ${on ? "border-primary bg-primary text-white dark:border-darkmode-primary dark:bg-darkmode-primary dark:text-text-dark" : "border-border text-text-light dark:border-darkmode-border dark:text-darkmode-text-light"}` : on ? `${plateInkClass(s.color)} shadow-md` : "bg-light text-text-dark dark:bg-darkmode-light dark:text-darkmode-text-dark"}`}
                    style={on && !create ? { background: plateVar(s.color) } : undefined}>
                    {create ? <FiEdit3 aria-hidden /> : <span className="h-2.5 w-2.5 rounded-full" style={{ background: on ? "currentColor" : plateVar(s.color), opacity: on ? 0.9 : 1 }} />}
                    {s.name}
                  </motion.span>
                  {idx < group.steps.length - 1 && <span aria-hidden className="text-text-light">›</span>}
                </li>
              );
            })}
            <li aria-hidden className="text-text-light">{group.custom ? "↻ back to the start" : "↻"}</li>
          </motion.ol>
        </AnimatePresence>
        <p className="mt-4 text-sm" aria-live="off">
          <AnimatePresence mode="wait"><motion.span key={`${g}-${i}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="block">
            {isCreate ? <>Build it your way: <b className="text-text-dark dark:text-darkmode-text-dark">{group.blurb}</b></> : <>Next up: <b className="text-text-dark dark:text-darkmode-text-dark">{step.name}</b>. {group.blurb} No fixed weekdays: miss a day and the cycle simply waits for you.</>}
          </motion.span></AnimatePresence>
        </p>
      </div>
    </div>
  );
}
