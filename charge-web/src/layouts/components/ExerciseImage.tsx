"use client";

import { exerciseImage } from "@/lib/labels";
import { useState } from "react";

export default function ExerciseImage({ id, index = 0, className = "h-12 w-12" }: { id: string; index?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span aria-hidden className={`${className} inline-block shrink-0 rounded bg-light dark:bg-darkmode-light`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={exerciseImage(id, index)} alt="" loading="lazy" onError={() => setFailed(true)} className={`${className} shrink-0 rounded bg-light object-cover dark:bg-darkmode-light`} />;
}
