import FitDemo from "@/components/FitDemo";
import LandingHero from "@/components/LandingHero";
import { PlateMark } from "@/components/Decor";
import Reveal from "@/components/Reveal";
import RotationDemo from "@/components/RotationDemo";
import SeoMeta from "@/partials/SeoMeta";
import { EXERCISES } from "@/lib/exercises";
import { GOAL_IDS } from "@/lib/goals";
import { RECIPES } from "@/lib/recipes";
import Link from "next/link";

const tiles = [
  { title: "Workouts that roll", text: "Pick Push/Pull/Legs, Upper/Lower, Full body, a body-part split or your own. Charge builds a cycle that rolls over, and you tap any exercise you don't like to swap it. No two plans come out exactly the same.", span: "md:col-span-2", demo: true },
  { title: "A tracker like the pros use", text: "Weight, reps, ✓ per set, a rest timer you can change, a chirp when you finish a set and an alarm and vibration when it's time to go again.", span: "" },
  { title: "Food log with a coach's eye", text: "Type \"150 g chicken breast\" and your calories and macros add up toward today's goal. Then Charge reviews the day and the week against your goal and tells you what to fix.", span: "" },
  { title: "Stock", text: "Track bars, whey and supplements. See when each one runs out, get a reminder, and reorder from Amazon, AliExpress or Alibaba in one tap.", span: "" },
  { title: "Community rooms", text: "Separate rooms for feedback, questions, tips and general chat.", span: "" },
  { title: "A phone app", text: "Install it on your home screen. Full screen, its own icon, light and dark themes, kg or lb.", span: "md:col-span-3" },
];

const steps = [
  { title: "Make an account", text: "Email, or Google if you prefer." },
  { title: "Answer a few short steps", text: "Username, body, goal, experience, and whether you train at the gym, at home or both." },
  { title: "Get your workouts", text: "Build your own or let the assistant propose a cycle. You decide what stays." },
  { title: "Train", text: "Start the next workout, log your sets, and watch the bar fill with plates." },
];

const facts = [
  { n: String(EXERCISES.length), l: "exercises with how-to steps" },
  { n: String(RECIPES.length), l: "recipes, from home cooking to North African" },
  { n: String(GOAL_IDS.length), l: "goals, each with its own workouts" },
];

export default function Home() {
  return (
    <>
      <SeoMeta />
      <LandingHero />

      <section className="section-sm">
        <div className="container">
          <Reveal>
            <dl className="grid grid-cols-3 divide-x-2 divide-border rounded-2xl border-2 border-border dark:divide-darkmode-border dark:border-darkmode-border">
              {facts.map((f) => (
                <div key={f.l} className="flex flex-col px-3 py-4 text-center sm:px-6 sm:py-6">
                  <dt className="order-2 mt-1 text-xs text-text-light sm:text-sm dark:text-darkmode-text-light">{f.l}</dt>
                  <dd className="font-secondary text-4xl font-black leading-none text-primary sm:text-6xl dark:text-darkmode-primary">{f.n}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          <div className="grid items-start gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
            <Reveal>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary dark:text-darkmode-primary">Your plan, checked</p>
              <h2 className="mb-4">A workout for the wrong goal gets flagged, not ignored</h2>
              <p className="mb-3">Lots of reps and short rests are great for endurance and a poor way to build muscle. Charge compares every workout, whether you built it or the assistant did, with your goal and your level, and says what to change.</p>
              <p>The same goes for food: each day and week is reviewed against your calories, protein and carbs, with ideas that fit what you already eat.</p>
            </Reveal>
            <Reveal delay={0.1}><FitDemo /></Reveal>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          <Reveal><h2 className="mb-8 max-w-xl">Everything a lifter keeps in their gym bag</h2></Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {tiles.map((t, i) => (
              <Reveal key={t.title} delay={(i % 3) * 0.07} className={t.span}>
                <div className="card h-full p-7">
                  <h3 className="h4 mb-2">{t.title}</h3>
                  <p className="mb-4">{t.text}</p>
                  {t.demo && <RotationDemo />}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-sm" id="how">
        <div className="container">
          <Reveal><h2 className="mb-8">How it works</h2></Reveal>
          <ol className="grid gap-6 md:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 0.09} className="relative border-t-4 border-primary pt-4 dark:border-darkmode-primary">
                <p className="font-secondary text-6xl font-black leading-none text-text-light/40">{i + 1}</p>
                <h3 className="h5 mb-1 mt-1">{s.title}</h3>
                <p>{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="section-sm pb-16">
        <div className="container">
          <Reveal>
            <div className="card relative flex flex-col items-center gap-5 overflow-hidden px-8 py-16 text-center">
              <PlateMark tone="red" spin="slow" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 opacity-[0.12] dark:opacity-[0.16]" />
              <PlateMark tone="blue" spin="slow-rev" className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 opacity-[0.10] dark:opacity-[0.14]" />
              <h2 className="relative">Ready for your first workout?</h2>
              <p className="relative max-w-lg">It's free, it takes about two minutes to set up, and you can change every answer later.</p>
              <Link href="/signup" className="btn btn-primary group relative !px-8 !py-3 text-lg">Get started <span aria-hidden className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span></Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
