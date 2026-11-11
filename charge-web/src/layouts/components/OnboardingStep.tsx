"use client";

import { finishOnboarding, saveOnboardingStep, type SaveResult } from "@/app/actions/onboarding";
import { ACTIVITY, DIETS, GOALS, LOCATION_LABEL, STEPS, STEP_TITLES, USERNAME_RE, type Step } from "@/lib/onboarding";
import { calcTargets } from "@/lib/nutrition";
import { EQUIPMENT_OPTIONS } from "@/lib/program";
import { cmToFtIn, fromDisplay, toDisplay, type Units } from "@/lib/units";
import { levelFor, levelTitle, nextLevel, sinceFor, TRAINING_TIME, type TrainingTimeId } from "@/lib/level";
import { motion } from "motion/react";
import Barbell, { type PlateTone } from "./Barbell";
import LimitsPicker from "./LimitsPicker";
import { AREA_LABEL, cleanLimits, type Limits } from "@/lib/limits";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Initial = {
  displayName: string; gender: string | null; birthYear: number | null; heightCm: number | null; weightKg: number | null; goalWeightKg: number | null;
  units: string; heightUnit: string; trainingTime: string | null; trainingSince: number | null; goal: string | null; experience: string | null; location: string | null; equipment: string[];
  activity: number | null; diet: string | null; injuries: string | null; limits: Limits; onboarded: boolean;
};

const PLATE_ORDER: PlateTone[] = ["red", "blue", "yellow", "green", "red", "blue", "steel"];

function Choice({ selected, onClick, title, text }: { selected: boolean; onClick: () => void; title: string; text?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`card w-full !rounded-xl border-2 px-5 py-4 text-left transition active:scale-[0.98] ${selected ? "!border-primary bg-primary/5 dark:!border-darkmode-primary dark:bg-darkmode-primary/10" : "hover:-translate-y-0.5 hover:border-text-light dark:hover:border-darkmode-text-light"}`}
    >
      <span className="block font-semibold text-text-dark dark:text-darkmode-text-dark">{title}</span>
      {text && <span className="block text-sm text-text-light dark:text-darkmode-text-light">{text}</span>}
    </button>
  );
}

function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded border border-border p-1 dark:border-darkmode-border">
      {options.map((o) => (
        <button key={String(o.id)} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
          className={`rounded-sm px-4 py-1.5 text-sm font-semibold ${value === o.id ? "bg-primary text-white dark:bg-darkmode-primary dark:text-text-dark" : "text-text-dark dark:text-darkmode-text-dark"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function OnboardingStep({ step, initial }: { step: Step; initial: Initial }) {
  const router = useRouter();
  const idx = STEPS.indexOf(step);
  const prev = idx > 0 ? STEPS[idx - 1] : null;
  const next = STEPS[idx + 1];
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  // state for every field; only the current step's fields are submitted
  const [displayName, setName] = useState(initial.displayName);
  const [gender, setGender] = useState(initial.gender ?? "");
  const [birthYear, setBirthYear] = useState(initial.birthYear ? String(initial.birthYear) : "");
  const [units, setUnits] = useState<Units>(initial.units === "lb" ? "lb" : "kg");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">(initial.heightUnit === "ft" ? "ft" : "cm");
  const [cm, setCm] = useState(initial.heightCm ? String(Math.round(initial.heightCm)) : "");
  const [ft, setFt] = useState(initial.heightCm ? String(cmToFtIn(initial.heightCm).ft) : "");
  const [inch, setInch] = useState(initial.heightCm ? String(cmToFtIn(initial.heightCm).inch) : "");
  const [weight, setWeight] = useState(initial.weightKg ? String(toDisplay(initial.weightKg, initial.units === "lb" ? "lb" : "kg")) : "");
  const [goalWeight, setGoalWeight] = useState(initial.goalWeightKg ? String(toDisplay(initial.goalWeightKg, initial.units === "lb" ? "lb" : "kg")) : "");
  const [goal, setGoal] = useState(initial.goal ?? "");
  const [trainingTime, setTrainingTime] = useState<string>(initial.trainingTime ?? "");
  const [atGym, setAtGym] = useState(initial.location === "gym" || initial.location === "both");
  const [atHome, setAtHome] = useState(initial.location === "home" || initial.location === "both");
  const [equipment, setEquipment] = useState<string[]>(initial.equipment);
  const [activity, setActivity] = useState<number | null>(initial.activity);
  const [diet, setDiet] = useState(initial.diet ?? "");
  const [injuries, setInjuries] = useState(initial.injuries ?? "");
  const [limits, setLimits] = useState<Limits>(initial.limits);

  function changeUnits(u: Units) {
    if (u === units) return;
    const conv = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isNaN(n) ? "" : String(toDisplay(fromDisplay(n, units), u)); };
    setWeight(conv(weight)); setGoalWeight(conv(goalWeight)); setUnits(u);
  }
  const heightCm = () => (heightUnit === "cm" ? parseFloat(cm.replace(",", ".")) : (parseInt(ft || "0") * 12 + parseInt(inch || "0")) * 2.54);
  const numOrNull = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isNaN(n) ? null : n; };

  function payload(): unknown {
    switch (step) {
      case "about": return { displayName, gender, birthYear: parseInt(birthYear) };
      case "body": return { units, heightUnit, heightCm: Math.round(heightCm() * 10) / 10, weight: numOrNull(weight), goalWeight: numOrNull(goalWeight) };
      case "goal": return { goal };
      case "experience": return { trainingTime };
      case "where": return { location: atGym && atHome ? "both" : atHome ? "home" : atGym ? "gym" : "", equipment: atHome ? equipment : [] };
      case "limits": return { limits, injuries: injuries.trim() || null };
      case "lifestyle": return { activity, diet };
      default: return {};
    }
  }
  const messages: Record<string, string> = {
    about: "Pick a username (3 to 20 letters, numbers, _ or .), a gender, and a valid birth year (age 14 to 90).",
    body: "Check your height and weight values.", goal: "Pick a goal to continue.", experience: "Pick how long you have been training.",
    limits: "Check your answers and try again.", where: "Choose gym, home, or both.", lifestyle: "Pick your activity level and diet.",
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      let res: SaveResult;
      if (step === "review") res = await finishOnboarding();
      else res = await saveOnboardingStep(step, payload());
      if (!res.ok) { setError(step === "review" || res.error !== "Please check the highlighted fields." ? res.error : messages[step] ?? res.error); return; }
      if (step === "review") router.replace("/dashboard?welcome=1");
      else router.push(`/onboarding/${next}`);
    });
  }

  const age = initial.birthYear ? new Date().getFullYear() - initial.birthYear : null;
  const targets = step === "review" && initial.weightKg && initial.heightCm && age && initial.gender && initial.activity && initial.goal
    ? calcTargets({ weightKg: initial.weightKg, heightCm: initial.heightCm, age, gender: initial.gender, activity: initial.activity, goal: initial.goal }) : null;

  return (
    <motion.form onSubmit={submit} className="w-full max-w-xl" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm text-text-light dark:text-darkmode-text-light">
          <span>Step {idx + 1} of {STEPS.length}</span><span>{STEP_TITLES[step]}</span>
        </div>
        <div role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={idx + 1} aria-label="Setup progress" className="mx-auto max-w-sm">
          <Barbell slots={STEPS.length} plates={PLATE_ORDER.slice(0, idx + 1)} label={`Step ${idx + 1} of ${STEPS.length}`} onlyLastAnimates />
        </div>
      </div>

      <div className="space-y-6">
        {step === "about" && (<>
          <div><h1 className="h3 mb-2">Let&apos;s get to know you</h1><p>We use this to size your plan. You can change it later in Settings.</p></div>
          <div><label htmlFor="displayName" className="form-label">Username</label><input id="displayName" className="form-input" value={displayName} onChange={(e) => setName(e.target.value.replace(/\s/g, ""))} autoComplete="username" maxLength={20} placeholder="e.g. iron_mehdi" aria-invalid={displayName.length > 0 && !USERNAME_RE.test(displayName)} /><p className="mt-2 text-sm text-text-light dark:text-darkmode-text-light">3 to 20 letters, numbers, _ or .</p></div>
          <div><span className="form-label">Gender</span>
            <div className="grid gap-3 sm:grid-cols-3">{[["male", "Male"], ["female", "Female"], ["other", "Other"]].map(([id, l]) => <Choice key={id} selected={gender === id} onClick={() => setGender(id)} title={l} />)}</div>
            <p className="mt-2 text-sm text-text-light dark:text-darkmode-text-light">Used only to estimate your calorie needs.</p></div>
          <div><label htmlFor="birthYear" className="form-label">Year of birth</label><input id="birthYear" className="form-input" inputMode="numeric" placeholder="e.g. 1998" value={birthYear} onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))} /></div>
        </>)}

        {step === "body" && (<>
          <div><h1 className="h3 mb-2">Your body</h1><p>Height and weight help us estimate calories and track your progress.</p></div>
          <div className="flex items-center justify-between"><span className="font-medium text-text-dark dark:text-darkmode-text-dark">Weight unit</span><Seg label="Weight unit" value={units} onChange={changeUnits} options={[{ id: "kg", label: "kg" }, { id: "lb", label: "lb" }]} /></div>
          <div>
            <div className="mb-2 flex items-center justify-between"><label htmlFor="cm" className="font-medium text-text-dark dark:text-darkmode-text-dark">Height</label><Seg label="Height unit" value={heightUnit} onChange={setHeightUnit} options={[{ id: "cm", label: "cm" }, { id: "ft", label: "ft / in" }]} /></div>
            {heightUnit === "cm" ? <input id="cm" className="form-input" inputMode="decimal" placeholder="175" value={cm} onChange={(e) => setCm(e.target.value)} />
              : <div className="grid grid-cols-2 gap-3"><input aria-label="Feet" className="form-input" inputMode="numeric" placeholder="5 ft" value={ft} onChange={(e) => setFt(e.target.value)} /><input aria-label="Inches" className="form-input" inputMode="numeric" placeholder="9 in" value={inch} onChange={(e) => setInch(e.target.value)} /></div>}
          </div>
          <div><label htmlFor="weight" className="form-label">Current weight ({units})</label><input id="weight" className="form-input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
          <div><label htmlFor="gw" className="form-label">Goal weight ({units}) <span className="text-base font-normal text-text-light">optional</span></label><input id="gw" className="form-input" inputMode="decimal" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} /></div>
        </>)}

        {step === "goal" && (<>
          <div><h1 className="h3 mb-2">What&apos;s your main goal?</h1><p>This shapes your sets, reps and calorie target.</p></div>
          <div className="space-y-3">{GOALS.map((g) => <Choice key={g.id} selected={goal === g.id} onClick={() => setGoal(g.id)} title={g.title} text={g.text} />)}</div>
        </>)}

        {step === "experience" && (<>
          <div><h1 className="h3 mb-2">How long have you been training?</h1><p>Be honest. It&apos;s how we pick exercises you can do well. Your level rises on its own as the months go by.</p></div>
          <div className="space-y-3">{TRAINING_TIME.map((g) => <Choice key={g.id} selected={trainingTime === g.id} onClick={() => setTrainingTime(g.id)} title={g.title} text={g.text} />)}</div>
          {trainingTime && (() => {
            const since = trainingTime === initial.trainingTime && initial.trainingSince != null ? initial.trainingSince : sinceFor(trainingTime as TrainingTimeId);
            const lvl = levelFor(since), nx = nextLevel(since);
            return <p role="status" data-testid="level-hint" className="rounded-lg bg-light px-4 py-3 text-sm dark:bg-darkmode-light">That makes you <b>{levelTitle(lvl)}</b>.{nx ? ` You'll move up to ${nx.level.title} on your own in about ${nx.months} month${nx.months > 1 ? "s" : ""}.` : " That is the top level."}</p>;
          })()}
        </>)}

        {step === "where" && (<>
          <div><h1 className="h3 mb-2">Where do you train?</h1><p>Pick one or both. We only suggest exercises you can actually do.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice selected={atGym} onClick={() => setAtGym((v) => !v)} title="At the gym" text="Barbells, machines, cables, dumbbells." />
            <Choice selected={atHome} onClick={() => setAtHome((v) => !v)} title="At home" text="Tell us what equipment you have." />
          </div>
          {atGym && atHome && <p className="rounded bg-light px-4 py-3 text-sm dark:bg-darkmode-light">Both: when you plan a workout, we&apos;ll ask whether it&apos;s a gym or a home session.</p>}
          {atHome && !atGym && equipment.length === 0 && <p className="rounded bg-light px-4 py-3 text-sm dark:bg-darkmode-light">No equipment selected: we&apos;ll plan bodyweight workouts. Pick what you own below for more variety.</p>}
          {atHome && (
            <div><span className="form-label">Your home equipment</span><p className="mb-3 text-sm text-text-light dark:text-darkmode-text-light">Bodyweight exercises are always included.</p>
              <div className="grid gap-3 sm:grid-cols-2">{EQUIPMENT_OPTIONS.map((o) => <Choice key={o.id} selected={equipment.includes(o.id)} onClick={() => setEquipment((cur) => cur.includes(o.id) ? cur.filter((x) => x !== o.id) : [...cur, o.id])} title={o.label} />)}</div></div>
          )}
        </>)}

        {step === "limits" && (<>
          <div><h1 className="h3 mb-2">Pain and injuries</h1><p>Tell us what hurts, so we never build you a workout that makes it worse. You can change this any time in Settings.</p></div>
          <LimitsPicker value={limits} onChange={setLimits} />
          <div><label htmlFor="inj" className="form-label">Anything else we should know? <span className="text-base font-normal text-text-light">optional</span></label><textarea id="inj" rows={3} maxLength={500} className="form-input" placeholder="e.g. torn ACL two years ago, doctor cleared me for light squats" value={injuries} onChange={(e) => setInjuries(e.target.value)} /></div>
        </>)}

        {step === "lifestyle" && (<>
          <div><h1 className="h3 mb-2">Lifestyle & food</h1><p>For your calorie and protein targets.</p></div>
          <div><span className="form-label">Daily activity outside the gym</span><div className="space-y-3">{ACTIVITY.map((a) => <Choice key={a.id} selected={activity === a.id} onClick={() => setActivity(a.id)} title={a.title} text={a.text} />)}</div></div>
          <div><span className="form-label">How do you eat?</span><div className="grid gap-3 sm:grid-cols-3">{DIETS.map((a) => <Choice key={a.id} selected={diet === a.id} onClick={() => setDiet(a.id)} title={a.title} />)}</div></div>
        </>)}

        {step === "review" && (<>
          <div><h1 className="h3 mb-2">You&apos;re all set{initial.displayName ? `, @${initial.displayName}` : ""}</h1><p>Here&apos;s a quick look at your profile. Next you&apos;ll land on your dashboard, where you can create workouts or ask the assistant to make them.</p></div>
          <dl className="divide-y divide-border rounded-lg border border-border dark:divide-darkmode-border dark:border-darkmode-border">
            {[["Goal", GOALS.find((g) => g.id === initial.goal)?.title], ["Experience", `${levelTitle(initial.experience)}${initial.trainingTime ? `, ${TRAINING_TIME.find((t) => t.id === initial.trainingTime)?.title.toLowerCase()}` : ""}`], ["Training", LOCATION_LABEL[initial.location ?? "gym"]], ["Pain or injuries", Object.keys(initial.limits).length ? (Object.entries(initial.limits) as [keyof typeof AREA_LABEL, string][]).map(([a, v]) => `${AREA_LABEL[a].toLowerCase()} (${v})`).join(", ") : "None, every exercise is allowed"], ["Plans", "We work out your sessions as you go"]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between px-5 py-3"><dt>{k}</dt><dd className="font-semibold text-text-dark dark:text-darkmode-text-dark">{v}</dd></div>
            ))}
          </dl>
          {targets && (
            <div className="rounded-lg bg-light p-5 dark:bg-darkmode-light"><p className="mb-2 font-semibold text-text-dark dark:text-darkmode-text-dark">Your daily targets (estimate)</p>
              <p>{targets.kcal} kcal · {targets.protein} g protein · {targets.carbs} g carbs · {targets.fat} g fat</p></div>
          )}
        </>)}

        {error && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {prev ? <Link href={`/onboarding/${prev}`} className="btn btn-outline-primary">Back</Link> : <span />}
          <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Saving…" : step === "review" ? "Go to my dashboard" : "Continue"}</button>
        </div>
      </div>
    </motion.form>
  );
}
