"use client";

import { assistantContext, proposePlan, swapProposed, type Proposal } from "@/app/actions/assistant";
import { saveProposal } from "@/app/actions/routines";
import { estimateMinutes, rotationLabel, SPLITS, TIME_CHOICES, type Rotation, type SplitId, type SplitOption } from "@/lib/splits";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ExerciseImage from "./ExerciseImage";
import GoalFit from "./GoalFit";

type Msg = { role: "bot" | "user"; text: string };
type Stage = "intro" | "split" | "rotation" | "where" | "time" | "times" | "loading" | "proposal" | "saved";
type Where = "gym" | "home" | "any";

const WHERE_LABEL: Record<Where, string> = { gym: "At the gym", home: "At home", any: "Either, mix it" };

const optClass = (primary?: boolean) =>
  `flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition active:scale-[0.99] ${primary ? "border-primary bg-primary text-white dark:border-darkmode-primary dark:bg-darkmode-primary dark:text-text-dark" : "border-border text-text-dark hover:border-primary dark:border-darkmode-border dark:text-darkmode-text-dark dark:hover:border-darkmode-primary"}`;
const Chevron = () => <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4l6 6-6 6" /></svg>;
/** Options in the chat: one under another, every one the same width. */
function Stack({ children }: { children: React.ReactNode }) {
  return <motion.div initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.04 } } }} className="flex flex-col gap-2" role="group">{children}</motion.div>;
}
function Opt({ title, desc, meta, badge, onClick, primary, disabled }: { title: string; desc?: string; meta?: string; badge?: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <motion.button type="button" variants={{ h: { opacity: 0, y: 8 }, s: { opacity: 1, y: 0 } }} onClick={onClick} disabled={disabled} className={`${optClass(primary)} disabled:opacity-60`}>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        {desc && <span className={`block text-sm ${primary ? "opacity-90" : "text-text dark:text-darkmode-text"}`}>{desc}</span>}
        {meta && <span className="mt-0.5 block text-xs opacity-70">{meta}</span>}
        {badge && <span className="mt-1.5 inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:text-amber-200">{badge}</span>}
      </span>
      <Chevron />
    </motion.button>
  );
}

export default function AssistantChat() {
  const router = useRouter();
  const [log, setLog] = useState<Msg[]>([]);
  const [stage, setStage] = useState<Stage>("intro");
  const [info, setInfo] = useState<{ name: string; location: "gym" | "home" | "both" } | null>(null);
  const [split, setSplit] = useState<SplitOption | null>(null);
  const [rotation, setRotation] = useState<Rotation | null>(null);
  const [where, setWhere] = useState<Where>("any");
  const [seed, setSeed] = useState(1);
  const nonce = useRef(1); // a random number picked when the chat starts, so each time you ask you get a different plan
  const [minutes, setMinutes] = useState<(number | null)[]>([]);
  const [perWorkout, setPerWorkout] = useState<(number | null)[]>([]);
  const [plan, setPlan] = useState<Proposal[]>([]);
  const [rejected, setRejected] = useState<Record<string, string[]>>({});
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const say = (role: Msg["role"], t: string) => setLog((l) => [...l, { role, text: t }]);

  useEffect(() => {
    assistantContext().then((c) => {
      setInfo({ name: c.name, location: c.location });
      setLog([{ role: "bot", text: `Hi${c.name ? ` ${c.name}` : ""}! I can build your workouts from your profile. I'll pick the number of exercises for you and learn from how long you really train. Ready?` }]);
    });
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [log, stage, plan, busyRow]);

  function start() {
    nonce.current = 1 + Math.floor(Math.random() * 1_000_000);
    setStage("split");
    say("user", "Build my workouts");
    say("bot", "Which style of split do you want?");
  }
  function chooseSplit(s: SplitOption) {
    setSplit(s);
    say("user", s.name);
    if (s.rotations.length === 1) return chooseRotation(s, s.rotations[0], true);
    setStage("rotation");
    say("bot", "No fixed weekdays: you just do the next workout in the cycle, and it rolls over. Pick a cycle.");
  }
  function chooseRotation(s: SplitOption, r: Rotation, silent = false) {
    setRotation(r);
    if (!silent) say("user", rotationLabel(r));
    if (info?.location === "both") {
      setStage("where");
      say("bot", "You train at the gym and at home. Where will you do these?");
      return;
    }
    generate(s, r, nonce.current, "any", []);
  }
  function chooseWhere(w: Where) {
    say("user", WHERE_LABEL[w]);
    setWhere(w);
    generate(split!, rotation!, nonce.current, w, []);
  }
  async function generate(s: SplitOption, r: Rotation, sd: number, w: Where, mins: (number | null)[] = minutes) {
    setStage("loading");
    setSeed(sd); setRejected({}); setMinutes(mins);
    const p = await proposePlan({ split: s.id as SplitId, rotationId: r.id, seed: sd, where: w, minutes: mins });
    setPlan(p);
    setStage("proposal");
    say("bot", mins.some(Boolean)
      ? `Done. Here's your cycle, fitted to the time you gave me. Tap any exercise you don't want and I'll suggest another one.`
      : `Here's your cycle: ${p.length} workouts. Tap any exercise you don't want and I'll suggest another one.`);
  }
  function askTime() {
    say("user", "Set the workout time");
    say("bot", "How long should each workout take? I'll add or drop exercises to fit.");
    setPerWorkout(plan.map((_, i) => minutes[i] ?? null));
    setStage("time");
  }
  function chooseTime(m: number | null) {
    say("user", m ? `${m} minutes each` : "Keep it as it is");
    if (!m) { setStage("proposal"); return; }
    generate(split!, rotation!, seed, where, plan.map(() => m));
  }
  function askEach() {
    say("user", "Different for each workout");
    say("bot", "Pick a time for every workout. Leave one on Auto and I'll choose its size.");
    setStage("times");
  }
  function applyEach() {
    say("user", plan.map((w, i) => `${w.name}: ${perWorkout[i] ? perWorkout[i] + " min" : "auto"}`).join(", "));
    generate(split!, rotation!, seed, where, perWorkout);
  }
  async function swap(wi: number, ei: number) {
    const row = plan[wi].exercises[ei]; const key = `${wi}-${ei}`;
    if (busyRow) return;
    setBusyRow(key);
    const exclude = [...plan[wi].exercises.map((e) => e.exerciseId), ...(rejected[key] ?? [])];
    const alt = await swapProposed({ exerciseId: row.exerciseId, slot: row.slot, exclude, where });
    setBusyRow(null);
    if (!alt) return say("bot", `I'm out of other options for ${row.lite.name}. You can swap it by hand after saving.`);
    setRejected((r) => ({ ...r, [key]: [...(r[key] ?? []), row.exerciseId] }));
    setPlan((p) => p.map((w, i) => (i !== wi ? w : { ...w, exercises: w.exercises.map((e, j) => (j !== ei ? e : { ...alt, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax, restSeconds: e.restSeconds, slot: alt.slot ?? e.slot })) })));
  }
  function remove(wi: number, ei: number) {
    setPlan((p) => p.map((w, i) => (i !== wi ? w : { ...w, exercises: w.exercises.filter((_, j) => j !== ei) })));
  }
  async function save() {
    const keep = plan.filter((w) => w.exercises.length);
    if (!keep.length) return;
    setSaving(true);
    const r = await saveProposal(keep.map((w) => ({ name: w.name, exercises: w.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax, restSeconds: e.restSeconds })) })));
    setSaving(false);
    if (!r.ok) return say("bot", r.error);
    setStage("saved");
    say("bot", `Saved ${keep.length} workout${keep.length > 1 ? "s" : ""} as your rotation. Start the first one from Home or My workouts. You can edit them any time.`);
    router.refresh();
  }
  function back(to: "split" | "rotation") {
    setPlan([]);
    if (to === "rotation" && split && split.rotations.length > 1) { setStage("rotation"); say("user", "Change the cycle"); say("bot", "Pick another cycle."); }
    else { setStage("split"); say("user", "Change the split"); say("bot", "Which style of split do you want?"); }
  }

  const mins = (w: Proposal) => estimateMinutes(w.exercises);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grow space-y-3 overflow-y-auto p-4" aria-live="polite">
        <AnimatePresence initial={false}>
          {log.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <p className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] ${m.role === "user" ? "bg-primary text-white dark:bg-darkmode-primary dark:text-text-dark" : "bg-light text-text-dark dark:bg-darkmode-light dark:text-darkmode-text-dark"}`}>{m.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>

        {stage === "intro" && info && <Stack><Opt title="Build my workouts" desc="I'll pick the exercises, sets and reps for your goal." onClick={start} primary /></Stack>}

        {stage === "split" && (
          <Stack>
            {SPLITS.map((sp) => <Opt key={sp.id} title={sp.name} desc={sp.blurb} meta={sp.muscles} onClick={() => chooseSplit(sp)} />)}
          </Stack>
        )}

        {stage === "rotation" && split && (
          <Stack>
            {split.rotations.map((r) => (
              <Opt key={r.id} title={`${r.keys.length} workouts in the cycle`} desc={rotationLabel(r)} meta={r.note} badge={r.restDay ? "Rest day between sessions" : undefined} onClick={() => chooseRotation(split, r)} />
            ))}
          </Stack>
        )}

        {stage === "where" && (
          <Stack>
            {(["gym", "home", "any"] as Where[]).map((w) => <Opt key={w} title={WHERE_LABEL[w]} onClick={() => chooseWhere(w)} />)}
          </Stack>
        )}

        {stage === "time" && (
          <Stack>
            {TIME_CHOICES.map((m) => <Opt key={m} title={`${m} minutes each`} onClick={() => chooseTime(m)} />)}
            <Opt title="Different for each workout" desc="Set a time for every workout in the cycle." onClick={askEach} />
            <Opt title="Keep it as it is" onClick={() => chooseTime(null)} />
          </Stack>
        )}

        {stage === "times" && (
          <Stack>
            {plan.map((w, i) => (
              <div key={w.name + i} className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-border px-4 py-3 dark:border-darkmode-border">
                <label htmlFor={`t-${i}`} className="min-w-0 truncate font-semibold text-text-dark dark:text-darkmode-text-dark">{w.name}</label>
                <select id={`t-${i}`} className="form-input !w-32 shrink-0 !py-1.5" value={perWorkout[i] ?? ""} onChange={(e) => setPerWorkout((p) => p.map((v, j) => (j === i ? (e.target.value ? Number(e.target.value) : null) : v)))}>
                  <option value="">Auto</option>
                  {TIME_CHOICES.map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            ))}
            <Opt title="Build with these times" onClick={applyEach} primary />
          </Stack>
        )}

        {stage === "loading" && <p className="animate-pulse text-sm">Putting your cycle together…</p>}

        {(stage === "proposal" || stage === "saved") && plan.some((w) => w.exercises.length) && (
          <GoalFit title="How this plan fits your goal" defaultOpen workouts={plan.filter((w) => w.exercises.length).map((w) => ({ name: w.name, exercises: w.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax, restSeconds: e.restSeconds })) }))} />
        )}

        {(stage === "proposal" || stage === "saved") && plan.map((w, wi) => (
          <motion.section key={w.name + wi} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: wi * 0.07 }} className="overflow-hidden card">
            <h3 className="h6 flex items-center justify-between border-b border-border bg-light px-4 py-2.5 dark:border-darkmode-border dark:bg-darkmode-light"><span>{w.name}</span><span className="text-xs font-normal text-text-light dark:text-darkmode-text-light" data-testid="wk-meta">{w.exercises.length} exercises · about {mins(w)} min</span></h3>
            <ul>
              <AnimatePresence initial={false} mode="popLayout">
                {w.exercises.map((e, ei) => {
                  const key = `${wi}-${ei}`;
                  return (
                    <motion.li layout key={key + e.exerciseId} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      className="flex items-center gap-2 border-b border-border last:border-0 dark:border-darkmode-border">
                      <button type="button" disabled={stage === "saved" || !!busyRow} onClick={() => swap(wi, ei)} aria-label={`${e.lite.name}. Tap to swap for another exercise`}
                        className="group flex min-w-0 grow items-center gap-3 px-3 py-2.5 text-left hover:bg-light disabled:cursor-default dark:hover:bg-darkmode-light">
                        <ExerciseImage id={e.exerciseId} className="h-11 w-11" />
                        <span className="min-w-0 grow">
                          <span className="block truncate font-semibold text-text-dark dark:text-darkmode-text-dark">{e.lite.name}</span>
                          <span className="block truncate text-xs text-text-light dark:text-darkmode-text-light">{e.lite.muscles} · {e.sets} × {e.repsMin === e.repsMax ? e.repsMin : `${e.repsMin}–${e.repsMax}`}{e.lite.timed ? " s" : ""}</span>
                        </span>
                        {stage === "proposal" && <span className="shrink-0 text-xs font-semibold text-primary dark:text-darkmode-primary">{busyRow === key ? "…" : "Swap"}</span>}
                      </button>
                      {stage === "proposal" && <button type="button" onClick={() => remove(wi, ei)} aria-label={`Remove ${e.lite.name}`} className="px-3 py-2 text-lg text-text-light hover:text-red-600">×</button>}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </motion.section>
        ))}

        {stage === "proposal" && (
          <Stack>
            <Opt title={saving ? "Saving…" : `Save ${plan.filter((w) => w.exercises.length).length} workouts`} onClick={save} primary disabled={saving} />
            <Opt title="Set the time for each workout" desc="Tell me how long you have and I'll fit the workouts." onClick={askTime} />
            {split && rotation && <Opt title="Suggest a different plan" onClick={() => generate(split, rotation, seed + 1, where)} />}
            {split && split.rotations.length > 1 && <Opt title="Change cycle" onClick={() => back("rotation")} />}
            <Opt title="Change split" onClick={() => back("split")} />
          </Stack>
        )}
        {stage === "saved" && (
          <Stack>
            <Link href="/dashboard" onClick={() => window.dispatchEvent(new Event("close-assistant"))} className={optClass(true)}><span className="font-semibold">Go to Home</span><Chevron /></Link>
            <Opt title="Build another plan" onClick={() => back("split")} />
          </Stack>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
