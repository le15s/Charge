"use client";

import { createRoutine } from "@/app/actions/routines";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function NewWorkoutForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); setError(""); start(async () => { const r = await createRoutine(name); if (!r.ok) return setError(r.error); router.push(`/workouts/${r.id}`); }); }} className="space-y-4">
      <div><label htmlFor="n" className="form-label">Workout name</label><input id="n" className="form-input font-marker text-2xl font-normal tracking-normal" placeholder="e.g. Push day" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Creating…" : "Create and add exercises"}</button>
    </form>
  );
}
