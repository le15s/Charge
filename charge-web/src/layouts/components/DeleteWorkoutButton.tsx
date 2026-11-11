"use client";

import { deleteWorkoutHistory } from "@/app/actions/workouts";
import { useState, useTransition } from "react";

export default function DeleteWorkoutButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (!confirm) return <button type="button" className="text-sm text-text-light underline hover:text-red-600 dark:text-darkmode-text-light" onClick={() => setConfirm(true)}>Delete</button>;
  return (
    <span className="flex items-center gap-3 text-sm">
      <button type="button" disabled={pending} className="font-semibold text-red-600" onClick={() => start(async () => { await deleteWorkoutHistory(id); })}>Delete for good</button>
      <button type="button" className="underline" onClick={() => setConfirm(false)}>Keep</button>
    </span>
  );
}
