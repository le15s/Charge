"use client";

import { dismissTour } from "@/app/actions/profile";
import Link from "next/link";
import { useState, useTransition } from "react";
import OpenAssistantButton from "./OpenAssistantButton";

export default function TourCard({ name }: { name: string }) {
  const [hidden, setHidden] = useState(false);
  const [, start] = useTransition();
  if (hidden) return null;
  const items = [
    { n: 1, title: "Create your workouts", text: "Build as many routines as you like (Push, Pull, Legs…) and choose the exercises, sets and reps.", action: <Link href="/workouts/new" className="btn btn-outline-primary btn-sm">New workout</Link> },
    { n: 2, title: "Or let the assistant do it", text: "Pick a split like Push/Pull/Legs, Upper/Lower or Full body and it proposes a workout. Tap any exercise you don't want and it suggests another.", action: <OpenAssistantButton className="btn btn-outline-primary btn-sm" /> },
    { n: 3, title: "Train and track", text: "Start a workout, log weight and reps, tick each set and use the rest timer between sets.", action: <Link href="/workouts" className="btn btn-outline-primary btn-sm">My workouts</Link> },
    { n: 4, title: "Watch your progress", text: "Every finished workout lands in your history with volume and personal records.", action: <Link href="/history" className="btn btn-outline-primary btn-sm">History</Link> },
  ];
  return (
    <section aria-label="Welcome tour" className="mb-8 rounded-xl border border-border bg-light p-6 dark:border-darkmode-border dark:bg-darkmode-light">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><h2 className="h4 mb-1">Welcome{name ? `, ${name}` : ""}! Here&apos;s how it works</h2><p>Four things you can do from here.</p></div>
        <button type="button" onClick={() => { setHidden(true); start(() => dismissTour()); }} className="btn btn-primary btn-sm shrink-0">Got it</button>
      </div>
      <ol className="grid gap-4 md:grid-cols-2">
        {items.map((i) => (
          <li key={i.n} className="flex gap-4 rounded-lg bg-body p-4 dark:bg-darkmode-body">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-secondary font-bold text-white dark:bg-darkmode-primary dark:text-text-dark">{i.n}</span>
            <div><h3 className="h6 mb-1">{i.title}</h3><p className="mb-3 text-sm">{i.text}</p>{i.action}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
