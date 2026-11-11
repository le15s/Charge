"use client";

import { USERNAME_RE } from "@/lib/onboarding";
import { authClient } from "@/lib/auth-client";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TONES = ["text-plate-red dark:text-darkmode-plate-red", "text-plate-blue dark:text-darkmode-plate-blue", "text-plate-yellow dark:text-darkmode-plate-yellow", "text-plate-green dark:text-darkmode-plate-green"];
const HEIGHTS = [124, 106, 88, 72];

/** How strong a password is, 0 to 4. Length counts most; a mix of letters, digits and symbols adds a little. */
function strength(p: string) {
  if (!p) return 0;
  if (p.length < 8) return 0.5;
  let s = 1;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s += 0.5;
  if (/\d/.test(p)) s += 0.5;
  if (/[^a-zA-Z0-9]/.test(p)) s += 0.5;
  return Math.min(4, Math.max(1, Math.floor(s + 0.5)));
}
const STRENGTH_WORD = ["", "Weak", "Okay", "Good", "Strong"];

/** A bar that gets a plate for every field you fill in correctly. */
function LoadingBar({ done, total }: { done: boolean[]; total: number }) {
  return (
    <svg viewBox="0 0 600 150" className="h-auto w-full" aria-hidden>
      <g className="text-text-dark dark:text-darkmode-text-dark">
        <rect x="6" y="71" width="588" height="8" rx="4" fill="currentColor" opacity="0.85" />
        <rect x="6" y="66" width="26" height="18" rx="3" fill="currentColor" opacity="0.9" />
        <rect x="568" y="66" width="26" height="18" rx="3" fill="currentColor" opacity="0.9" />
        <rect x="262" y="64" width="6" height="22" rx="2" fill="currentColor" opacity="0.9" />
        <rect x="332" y="64" width="6" height="22" rx="2" fill="currentColor" opacity="0.9" />
      </g>
      {Array.from({ length: total }).map((_, i) => {
        const h = HEIGHTS[i], off = 56 + i * 21;
        return [1, -1].map((side) => {
          const x = side === 1 ? 300 + off : 300 - off - 17;
          const common = { x, y: 75 - h / 2, width: 17, height: h, rx: 3 };
          return (
            <g key={`${i}${side}`}>
              <rect {...common} fill="none" stroke="currentColor" strokeDasharray="3 4" strokeWidth="1.6" className="text-text-light/60 dark:text-darkmode-text-light/60" />
              <AnimatePresence>
                {done[i] && (
                  <motion.g className={TONES[i]} initial={{ x: side * 90, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: side * 40, opacity: 0 }} transition={{ type: "spring", stiffness: 220, damping: 18 }}>
                    <rect {...common} fill="currentColor" />
                    <rect x={x + 3} y={75 - h / 2 + 6} width={3} height={h - 12} rx={1.5} fill="#fff" opacity="0.35" />
                  </motion.g>
                )}
              </AnimatePresence>
            </g>
          );
        });
      })}
    </svg>
  );
}

function Eye({ off }: { off: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

const label = "mb-1.5 block font-medium text-text-dark dark:text-darkmode-text-dark";
const hint = "mt-1.5 text-sm text-text-light dark:text-darkmode-text-light";
const bad = "mt-1.5 text-sm font-medium text-red-700 dark:text-red-300";

export default function AuthForm({ mode, googleEnabled }: { mode: "login" | "signup"; googleEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({ username: "", email: "", password: "", confirm: "" });
  const [seen, setSeen] = useState<Record<string, boolean>>({});
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const refs = { username: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null), confirm: useRef<HTMLInputElement>(null) };
  const isSignup = mode === "signup";

  const name = v.username.trim(), email = v.email.trim();
  const problems = {
    username: isSignup && !USERNAME_RE.test(name) ? "Use 3 to 20 letters, numbers, _ or ." : "",
    email: !EMAIL_RE.test(email) ? "Enter an email like name@example.com." : "",
    password: isSignup ? (v.password.length < 8 ? `At least 8 characters (${8 - v.password.length} more).` : "") : (!v.password ? "Enter your password." : ""),
    confirm: isSignup && v.password !== v.confirm ? "The two passwords don't match yet." : "",
  };
  const fields = (isSignup ? ["username", "email", "password", "confirm"] : ["email", "password"]) as (keyof typeof problems)[];
  const done = fields.map((f) => !problems[f] && (f !== "confirm" || !!v.confirm));
  const count = done.filter(Boolean).length;
  const score = strength(v.password);
  const show1 = (f: keyof typeof problems) => (seen[f] || seen.all) && problems[f];

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => { setV((o) => ({ ...o, [k]: e.target.value })); if (error) setError(""); };
  const blur = (k: string) => () => setSeen((s) => ({ ...s, [k]: true }));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const first = fields.find((f) => problems[f]);
    if (first) { setSeen({ all: true }); refs[first].current?.focus(); return; }
    setBusy(true);
    const res = isSignup
      ? await authClient.signUp.email({ name, email, password: v.password })
      : await authClient.signIn.email({ email, password: v.password });
    setBusy(false);
    if (res.error) return setError(res.error.message ?? "Something went wrong. Please try again.");
    router.push(isSignup ? "/onboarding" : "/dashboard");
    router.refresh();
  }

  async function google() {
    setError("");
    const res = await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
    if (res?.error) setError(res.error.message ?? "Google sign-in failed.");
  }

  const check = (f: keyof typeof problems) => done[fields.indexOf(f)] && <span aria-hidden className="text-sm font-bold text-emerald-600 dark:text-emerald-400">✓</span>;
  const inv = (f: keyof typeof problems) => (show1(f) ? true : undefined);

  return (
    <MotionConfig reducedMotion="user">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border-2 border-border bg-body shadow-[0_30px_60px_-36px_color-mix(in_srgb,var(--color-primary)_50%,transparent)] dark:border-darkmode-border dark:bg-darkmode-body lg:grid-cols-[0.9fr_1.1fr]" data-testid="auth-card">
        {/* Left: the bar fills up as you go */}
        <motion.aside initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="relative flex flex-col justify-between gap-4 overflow-hidden bg-light px-6 py-6 dark:bg-darkmode-light sm:px-9 sm:py-9 lg:py-12">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-primary)_22%,transparent),transparent)]" />
          <div className="relative">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary dark:text-darkmode-primary">{isSignup ? "Create your account" : "Welcome back"}</p>
            <h1 className="mb-2 text-[2.3rem] leading-[0.95] sm:text-[3.2rem]">{isSignup ? <>Load the bar.<br />We'll build the plan.</> : <>Your bar is<br />waiting.</>}</h1>
            <p className="hidden max-w-sm sm:block">{isSignup ? "Four quick answers now. Next you'll answer a few questions about your body and goal so the plan fits you." : "Log in to continue your training: your next workout, your food log and your stock are where you left them."}</p>
          </div>
          <div className="relative">
            <LoadingBar done={done} total={fields.length} />
            <p className="mt-1 text-sm font-semibold text-text-dark dark:text-darkmode-text-dark" data-testid="auth-progress">{count === fields.length ? "Loaded. Ready to lift." : `${count} of ${fields.length} plates on`}</p>
          </div>
          <ul className="relative hidden gap-2 text-sm lg:grid">
            {(isSignup ? ["Free, with no card needed", "Workouts built for your goal and equipment", "Every plan and meal checked against your goal"] : ["Your cycle keeps rolling from where you stopped", "Your rest timer and sounds are as you set them"]).map((t) => (
              <li key={t} className="flex gap-2"><span aria-hidden className="font-bold text-primary dark:text-darkmode-primary">✓</span>{t}</li>
            ))}
          </ul>
        </motion.aside>

        {/* Right: the form */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }} className="px-6 py-7 sm:px-9 sm:py-9 lg:py-12">
          <h2 className="h3 mb-5">{isSignup ? "Let's get you set up" : "Log in"}</h2>

          {googleEnabled && (
            <>
              <button type="button" onClick={google} className="btn btn-outline-primary mb-4 flex w-full items-center justify-center gap-3">
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.2-3.9 7.2-9.6 7.2-16.9z" />
                  <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
                  <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.6 2.3-8.8 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
                </svg>
                Continue with Google
              </button>
              <div className="mb-4 flex items-center gap-3 text-sm text-text-light dark:text-darkmode-text-light">
                <span className="h-px grow bg-border dark:bg-darkmode-border" />or use email<span className="h-px grow bg-border dark:bg-darkmode-border" />
              </div>
            </>
          )}

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {isSignup && (
              <div>
                <div className="flex items-center justify-between"><label htmlFor="username" className={label}>Username</label>{check("username")}</div>
                <input ref={refs.username} id="username" name="username" value={v.username} onChange={set("username")} onBlur={blur("username")} className="form-input" autoComplete="username" placeholder="e.g. iron_mehdi" maxLength={20} aria-invalid={inv("username")} aria-describedby="username-note" required />
                <p id="username-note" className={show1("username") ? bad : hint}>{show1("username") || "This is how you'll show up in the community."}</p>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between"><label htmlFor="email" className={label}>Email</label>{check("email")}</div>
              <input ref={refs.email} id="email" name="email" type="email" value={v.email} onChange={set("email")} onBlur={blur("email")} className="form-input" autoComplete="email" placeholder="you@example.com" aria-invalid={inv("email")} aria-describedby="email-note" required />
              {show1("email") && <p id="email-note" className={bad}>{problems.email}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between"><label htmlFor="password" className={label}>Password</label>{check("password")}</div>
              <div className="relative">
                <input ref={refs.password} id="password" name="password" type={show ? "text" : "password"} value={v.password} onChange={set("password")} onBlur={(e) => { blur("password")(); setCaps(false); void e; }} onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock") ?? false)} className="form-input !pr-12" autoComplete={isSignup ? "new-password" : "current-password"} aria-invalid={inv("password")} aria-describedby="password-note" required />
                <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-label={show ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-text-light hover:text-text-dark dark:text-darkmode-text-light dark:hover:text-darkmode-text-dark"><Eye off={show} /></button>
              </div>
              <div id="password-note">
                {show1("password") ? <p className={bad}>{problems.password}</p> : isSignup && !v.password ? <p className={hint}>At least 8 characters. A longer phrase is stronger.</p> : null}
                {caps && <p className="mt-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">Caps Lock is on.</p>}
              </div>
              {isSignup && v.password && (
                <div className="mt-2" aria-live="polite">
                  <div className="flex gap-1" aria-hidden>
                    {[1, 2, 3, 4].map((n) => <span key={n} className={`h-1.5 grow rounded-full transition-colors duration-300 ${score >= n ? (score <= 1 ? "bg-red-500" : score === 2 ? "bg-amber-500" : "bg-emerald-500") : "bg-border dark:bg-darkmode-border"}`} />)}
                  </div>
                  <p className="mt-1 text-sm text-text-light dark:text-darkmode-text-light">{score < 1 ? "Too short yet" : `Strength: ${STRENGTH_WORD[score]}`}</p>
                </div>
              )}
            </div>
            {isSignup && (
              <div>
                <div className="flex items-center justify-between"><label htmlFor="confirm" className={label}>Confirm password</label>{check("confirm")}</div>
                <input ref={refs.confirm} id="confirm" name="confirm" type={show ? "text" : "password"} value={v.confirm} onChange={set("confirm")} onBlur={blur("confirm")} className="form-input" autoComplete="new-password" aria-invalid={inv("confirm")} aria-describedby="confirm-note" required />
                {(show1("confirm") || (v.confirm && problems.confirm && v.confirm.length >= v.password.length)) && <p id="confirm-note" className={bad}>{problems.confirm}</p>}
              </div>
            )}
            <div aria-live="assertive">{error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}</div>
            <button type="submit" className="btn btn-primary group w-full !py-3 text-lg" disabled={busy}>
              {busy ? (<span className="inline-flex items-center gap-2"><span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Please wait…</span>) : (<>{isSignup ? "Create account" : "Log in"} <span aria-hidden className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span></>)}
            </button>
          </form>

          <p className="mt-6 text-center text-sm">
            {isSignup ? (<>Already have an account? <Link href="/login" className="font-semibold underline">Log in</Link></>) : (<>New here? <Link href="/signup" className="font-semibold underline">Create an account</Link></>)}
          </p>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
