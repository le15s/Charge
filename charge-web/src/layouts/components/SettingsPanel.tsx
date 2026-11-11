"use client";

import InstallApp from "./InstallApp";
import { MusicManager } from "./MusicLinks";
import type { MusicItem } from "@/lib/music";
import { canVibrate, soundRestOver, soundSetDone, unlockAudio, vibrate, VIBRATE_REST_OVER } from "@/lib/feedback";
import { logBodyWeight, updateFeedbackSettings, updateProfileDetails, updateSettings, updateUsername } from "@/app/actions/profile";
import { levelFor, levelTitle, nextLevel, sinceFor, TRAINING_TIME, type TrainingTimeId } from "@/lib/level";
import { ACTIVITY, DIETS, GOALS } from "@/lib/onboarding";
import { authClient } from "@/lib/auth-client";
import { cmToFtIn, fromDisplay, ftInToCm, toDisplay, type Units } from "@/lib/units";
import Link from "next/link";
import LimitsPicker from "./LimitsPicker";
import type { Limits } from "@/lib/limits";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Props = {
  music?: MusicItem[];
  email: string;
  hasPassword: boolean;
  initialTab?: "personal" | "app";
  equipmentOptions: { id: string; label: string }[];
  p: {
    displayName: string; gender: string; birthYear: number | null; heightCm: number | null; weightKg: number | null; goal: string; experience: string; trainingTime: string; trainingSince: number | null; heightUnit: string; goalWeightKg: number | null; injuries: string; limits: Limits;
    location: string; equipment: string[]; activity: number; diet: string; units: string; restSeconds: number; soundEnabled: boolean; vibrationEnabled: boolean; soundVolume: number; keepAwake: boolean;
  };
};

function Card({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="h5">{title}</h2>
      {text && <p className="mt-1 text-sm text-text-light dark:text-darkmode-text-light">{text}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap rounded border border-border p-1 dark:border-darkmode-border">
      {options.map((o) => (
        <button key={String(o.id)} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
          className={`rounded-sm px-4 py-1.5 text-sm font-semibold ${value === o.id ? "bg-primary text-white dark:bg-darkmode-primary dark:text-text-dark" : "text-text-dark dark:text-darkmode-text-dark"}`}>{o.label}</button>
      ))}
    </div>
  );
}
function Toggle({ on, onChange, label, text }: { on: boolean; onChange: (v: boolean) => void; label: string; text?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div><p className="font-semibold text-text-dark dark:text-darkmode-text-dark">{label}</p>{text && <p className="text-sm text-text-light dark:text-darkmode-text-light">{text}</p>}</div>
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
        className={`group relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ${on ? "bg-primary dark:bg-darkmode-primary" : "bg-border dark:bg-darkmode-border"}`}>
        <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-active:w-7 ${on ? "translate-x-5 group-active:translate-x-4" : ""}`} />
      </button>
    </div>
  );
}
const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-text-dark dark:text-darkmode-text-dark">{children}</label>;

export default function SettingsPanel({ email, hasPassword, initialTab = "personal", equipmentOptions, p, music = [] }: Props) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [pending, start] = useTransition();

  /* which of the two main sections is open (kept in the address so a refresh or a link lands on the same one) */
  const [tab, setTab] = useState<"personal" | "app">(initialTab);
  function pickTab(t: "personal" | "app") { setTab(t); try { const u = new URL(window.location.href); u.searchParams.set("tab", t); window.history.replaceState(null, "", u); } catch { /* ignore */ } }

  /* units + rest */
  const [units, setUnits] = useState<Units>(p.units === "lb" ? "lb" : "kg");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">(p.heightUnit === "ft" ? "ft" : "cm");
  const [rest, setRest] = useState(String(p.restSeconds));
  const [prefMsg, setPrefMsg] = useState("");
  function savePrefs(next?: { units?: Units; heightUnit?: "cm" | "ft" }) {
    const r = parseInt(rest);
    start(async () => {
      const res = await updateSettings({ units: next?.units ?? units, heightUnit: next?.heightUnit ?? heightUnit, restSeconds: isNaN(r) ? undefined : r });
      setPrefMsg(res.ok ? "Saved." : "Rest time must be between 10 and 900 seconds.");
      router.refresh();
    });
  }

  /* sound + vibration */
  const [sound, setSound] = useState(p.soundEnabled);
  const [vib, setVib] = useState(p.vibrationEnabled);
  const [vol, setVol] = useState(p.soundVolume);
  const [awake, setAwake] = useState(p.keepAwake);
  const [vibOk, setVibOk] = useState(true);
  useEffect(() => setVibOk(canVibrate()), []);
  const saveFeedback = (patch: Parameters<typeof updateFeedbackSettings>[0]) => { start(async () => { await updateFeedbackSettings(patch); }); };

  /* body weight */
  const [bw, setBw] = useState(p.weightKg ? String(toDisplay(p.weightKg, units)) : "");
  const [bwMsg, setBwMsg] = useState("");
  function saveWeight() {
    const n = parseFloat(bw.replace(",", "."));
    start(async () => { const r = await logBodyWeight(n, units); setBwMsg(r.ok ? "Weight logged." : r.error ?? "Could not save."); router.refresh(); });
  }

  /* personal info */
  const [gender, setGender] = useState(p.gender);
  const [birthYear, setBirthYear] = useState(p.birthYear ? String(p.birthYear) : "");
  const [cm, setCm] = useState(p.heightCm ? String(Math.round(p.heightCm)) : "");
  const [ft, setFt] = useState(p.heightCm ? String(cmToFtIn(p.heightCm).ft) : "");
  const [inch, setInch] = useState(p.heightCm ? String(cmToFtIn(p.heightCm).inch) : "");
  const [goalW, setGoalW] = useState(p.goalWeightKg ? String(toDisplay(p.goalWeightKg, units)) : "");
  const [goal, setGoal] = useState(p.goal);
  const [trainingTime, setTrainingTime] = useState<string>(p.trainingTime);
  const [location, setLocation] = useState(p.location);
  const [equipment, setEquipment] = useState<string[]>(p.equipment);
  const [activity, setActivity] = useState(p.activity);
  const [diet, setDiet] = useState(p.diet);
  const [injuries, setInjuries] = useState(p.injuries);
  const [limits, setLimits] = useState<Limits>(p.limits);
  const [profMsg, setProfMsg] = useState("");
  const num = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isNaN(n) ? null : n; };
  // switching the height unit converts what is typed, so nothing has to be re-entered
  function pickHeightUnit(u: "cm" | "ft") {
    if (u === heightUnit) return;
    const c = heightUnit === "cm" ? num(cm) : ftInToCm(parseInt(ft || "0"), parseInt(inch || "0"));
    if (c) { setCm(String(Math.round(c))); setFt(String(cmToFtIn(c).ft)); setInch(String(cmToFtIn(c).inch)); }
    setHeightUnit(u); savePrefs({ heightUnit: u });
  }
  const heightCm = () => (heightUnit === "cm" ? num(cm) : ftInToCm(parseInt(ft || "0"), parseInt(inch || "0")));
  function changeUnit(u: Units) {
    const g = num(goalW); if (g != null) setGoalW(String(toDisplay(fromDisplay(g, units), u)));
    setUnits(u); setBw(p.weightKg ? String(toDisplay(p.weightKg, u)) : ""); savePrefs({ units: u });
  }
  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const g = num(goalW);
    start(async () => {
      const r = await updateProfileDetails({ gender, birthYear: parseInt(birthYear), heightCm: heightCm() ? Math.round(heightCm()! * 10) / 10 : NaN, goalWeightKg: g == null ? null : fromDisplay(g, units), goal, trainingTime, location, equipment, activity, diet, injuries: injuries.trim() || null, limits });
      setProfMsg(r.ok ? "Saved. New workouts from the assistant will use these answers." : r.error ?? "Could not save.");
      router.refresh();
    });
  }
  const since = trainingTime === p.trainingTime && p.trainingSince != null ? p.trainingSince : trainingTime ? sinceFor(trainingTime as TrainingTimeId) : null;
  const lvl = since != null ? levelFor(since) : null;
  const nxt = since != null ? nextLevel(since) : null;

  /* account */
  const [username, setUsername] = useState(p.displayName);
  const [userMsg, setUserMsg] = useState("");
  function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    start(async () => { const r = await updateUsername(username); setUserMsg(r.ok ? "Username saved." : r.error); router.refresh(); });
  }
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setPwMsg(null);
    if (newPw.length < 8) return setPwMsg({ ok: false, text: "The new password needs at least 8 characters." });
    const res = await authClient.changePassword({ currentPassword: curPw, newPassword: newPw, revokeOtherSessions: true });
    if (res.error) return setPwMsg({ ok: false, text: res.error.message ?? "Could not change the password. Check your current one." });
    setCurPw(""); setNewPw(""); setPwMsg({ ok: true, text: "Password changed. Other devices were signed out." });
  }
  const [pw, setPw] = useState("");
  const [typed, setTyped] = useState("");
  const [delMsg, setDelMsg] = useState("");
  async function logout() { await authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } }); }
  async function deleteAccount() {
    setDelMsg("");
    const res = await authClient.deleteUser(hasPassword ? { password: pw } : {});
    if (res.error) { setDelMsg(res.error.message ?? "Could not delete the account. If you signed in with Google, sign out and back in first, then try again."); return; }
    window.location.href = "/";
  }

  const tabBtn = (id: "personal" | "app", label: string, hint: string) => (
    <button type="button" role="tab" id={`stab-${id}`} aria-selected={tab === id} aria-controls={`spanel-${id}`} onClick={() => pickTab(id)}
      className={`flex-1 rounded-lg px-4 py-3 text-left transition ${tab === id ? "bg-primary text-white shadow dark:bg-darkmode-primary dark:text-text-dark" : "bg-light hover:brightness-95 dark:bg-darkmode-light"}`}>
      <span className="block font-semibold">{label}</span><span className={`block text-xs ${tab === id ? "opacity-90" : "text-text-light dark:text-darkmode-text-light"}`}>{hint}</span>
    </button>
  );

  return (
    <div>
      <div role="tablist" aria-label="Settings sections" className="mb-6 flex gap-3">
        {tabBtn("personal", "Personal info", "You: body, goal, training")}
        {tabBtn("app", "App settings", "Account, sound, units, theme")}
      </div>

      {tab === "personal" && (
        <div role="tabpanel" id="spanel-personal" aria-labelledby="stab-personal" className="space-y-6" data-testid="panel-personal">
          <Card title="Body weight" text="Log your weight whenever you weigh in. Your latest entry is used for your calorie and protein targets.">
            <div className="flex max-w-sm gap-3">
              <input aria-label={`Weight in ${units}`} inputMode="decimal" className="form-input !py-3" value={bw} onChange={(e) => setBw(e.target.value)} placeholder={units} />
              <button className="btn btn-primary shrink-0" disabled={pending} onClick={saveWeight}>Log</button>
            </div>
            {bwMsg && <p role="status" className="mt-3 text-sm">{bwMsg}</p>}
            <p className="mt-3 text-sm"><Link href="/body" className="underline">See your weight chart, measurements and photos</Link></p>
          </Card>

          <form onSubmit={saveProfile} className="space-y-6">
            <Card title="About you" text="Used to estimate your calories and protein.">
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="pyear">Birth year</Label><input id="pyear" inputMode="numeric" className="form-input !py-3" value={birthYear} onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))} /></div>
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3"><label htmlFor={heightUnit === "cm" ? "pheight" : "pft"} className="text-sm font-semibold text-text-dark dark:text-darkmode-text-dark">Height</label><Seg label="Height unit" value={heightUnit} onChange={pickHeightUnit} options={[{ id: "cm", label: "cm" }, { id: "ft", label: "ft / in" }]} /></div>
                    {heightUnit === "cm"
                      ? <input id="pheight" inputMode="decimal" className="form-input !py-3" value={cm} onChange={(e) => setCm(e.target.value)} />
                      : <div className="grid grid-cols-2 gap-3"><input id="pft" aria-label="Feet" inputMode="numeric" placeholder="ft" className="form-input !py-3" value={ft} onChange={(e) => setFt(e.target.value)} /><input aria-label="Inches" inputMode="numeric" placeholder="in" className="form-input !py-3" value={inch} onChange={(e) => setInch(e.target.value)} /></div>}
                  </div>
                </div>
                <div><Label>Gender</Label><Seg label="Gender" value={gender} onChange={setGender} options={[{ id: "male", label: "Male" }, { id: "female", label: "Female" }, { id: "other", label: "Other" }]} /></div>
                <div className="max-w-xs"><Label htmlFor="pgw">Goal weight ({units}) <span className="font-normal text-text-light dark:text-darkmode-text-light">optional</span></Label><input id="pgw" inputMode="decimal" className="form-input !py-3" value={goalW} onChange={(e) => setGoalW(e.target.value)} /></div>
              </div>
            </Card>

            <Card title="Goal and experience" text="This shapes the workouts the assistant builds for you.">
              <div className="space-y-5">
                <div><Label htmlFor="pgoal">Goal</Label><select id="pgoal" className="form-input !py-3" value={goal} onChange={(e) => setGoal(e.target.value)}>{GOALS.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
                <div>
                  <Label htmlFor="ptime">How long have you been training?</Label>
                  <select id="ptime" className="form-input !py-3" value={trainingTime} onChange={(e) => setTrainingTime(e.target.value)}>{TRAINING_TIME.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
                  {lvl && <p className="mt-2 text-sm" data-testid="level-line">Your level: <b>{levelTitle(lvl)}</b>.{nxt ? ` You move up to ${nxt.level.title} by yourself in about ${nxt.months} month${nxt.months > 1 ? "s" : ""}.` : " That is the top level."}</p>}
                </div>
                <div><Label>Where you train</Label><Seg label="Where you train" value={location} onChange={setLocation} options={[{ id: "gym", label: "At the gym" }, { id: "home", label: "At home" }, { id: "both", label: "Both" }]} /></div>
                {location !== "gym" && (
                  <fieldset><legend className="mb-2 text-sm font-semibold text-text-dark dark:text-darkmode-text-dark">Equipment at home</legend>
                    <div className="flex flex-wrap gap-2">{equipmentOptions.map((o) => { const on = equipment.includes(o.id); return <button type="button" key={o.id} aria-pressed={on} onClick={() => setEquipment(on ? equipment.filter((x) => x !== o.id) : [...equipment, o.id])} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${on ? "border-primary bg-primary text-white dark:border-darkmode-primary dark:bg-darkmode-primary dark:text-text-dark" : "border-border dark:border-darkmode-border"}`}>{o.label}</button>; })}</div></fieldset>
                )}
              </div>
            </Card>

            <Card title="Lifestyle">
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="pact">Daily activity</Label><select id="pact" className="form-input !py-3" value={activity} onChange={(e) => setActivity(parseFloat(e.target.value))}>{ACTIVITY.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select></div>
                  <div><Label htmlFor="pdiet">Diet</Label><select id="pdiet" className="form-input !py-3" value={diet} onChange={(e) => setDiet(e.target.value)}>{DIETS.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></div>
                </div>
                <div><Label htmlFor="plim">Pain and injuries</Label><LimitsPicker value={limits} onChange={setLimits} /></div>
                <div><Label htmlFor="pinj">Anything else about injuries <span className="font-normal text-text-light dark:text-darkmode-text-light">optional</span></Label><textarea id="pinj" rows={2} className="form-input" value={injuries} onChange={(e) => setInjuries(e.target.value)} /></div>
              </div>
            </Card>

            <div className="flex flex-wrap items-center gap-4"><button className="btn btn-primary" disabled={pending}>Save personal info</button>{profMsg && <p role="status" className="text-sm">{profMsg}</p>}</div>
          </form>
        </div>
      )}

      {tab === "app" && (
        <div role="tabpanel" id="spanel-app" aria-labelledby="stab-app" className="space-y-6" data-testid="panel-app">
          <Card title="Account" text={`Signed in as ${email}.`}>
            <div className="space-y-8">
              <form onSubmit={saveUsername} className="max-w-sm">
                <Label htmlFor="pname">Username</Label>
                <div className="flex gap-3"><input id="pname" className="form-input !py-3" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /><button className="btn btn-primary shrink-0" disabled={pending || username === p.displayName}>Save</button></div>
                {userMsg && <p role="status" className="mt-2 text-sm">{userMsg}</p>}
              </form>
              {hasPassword && (
                <form onSubmit={changePassword} className="grid max-w-sm gap-3">
                  <h3 className="h6">Change password</h3>
                  <div><Label htmlFor="curpw">Current password</Label><input id="curpw" type="password" autoComplete="current-password" className="form-input !py-3" value={curPw} onChange={(e) => setCurPw(e.target.value)} /></div>
                  <div><Label htmlFor="newpw">New password (8 characters or more)</Label><input id="newpw" type="password" autoComplete="new-password" className="form-input !py-3" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></div>
                  <div><button className="btn btn-outline-primary" disabled={!curPw || !newPw}>Change password</button></div>
                  {pwMsg && <p role={pwMsg.ok ? "status" : "alert"} className={`text-sm ${pwMsg.ok ? "" : "text-red-600"}`}>{pwMsg.text}</p>}
                </form>
              )}
              <div><button className="btn btn-outline-primary" onClick={logout}>Log out</button></div>
            </div>
          </Card>

          <Card title="Appearance" text="Light, dark, or follow your device.">
            {mounted && <Seg label="Theme" value={theme ?? "system"} onChange={setTheme} options={[{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }, { id: "system", label: "System" }]} />}
          </Card>

          <Card title="Units and rest timer" text="Weights are stored in kilograms and heights in centimetres, so you can switch at any time without losing anything.">
            <div className="space-y-5">
              <div><Label>Weight unit</Label><Seg label="Weight unit" value={units} onChange={changeUnit} options={[{ id: "kg", label: "Kilograms (kg)" }, { id: "lb", label: "Pounds (lb)" }]} /></div>
              <div><Label>Height unit</Label><Seg label="Height unit setting" value={heightUnit} onChange={pickHeightUnit} options={[{ id: "cm", label: "Centimetres (cm)" }, { id: "ft", label: "Feet and inches" }]} /></div>
              <div className="max-w-xs"><Label htmlFor="rest">Default rest between sets (seconds)</Label><input id="rest" inputMode="numeric" className="form-input !py-3" value={rest} onChange={(e) => setRest(e.target.value)} onBlur={() => savePrefs()} /><p className="mt-2 text-sm text-text-light dark:text-darkmode-text-light">You can still change the timer for each exercise during a workout.</p></div>
              {prefMsg && <p role="status" className="text-sm">{prefMsg}</p>}
            </div>
          </Card>

          <Card title="Sound and vibration" text="What happens when you complete a set and when your rest is over.">
            <div className="space-y-6">
              <Toggle on={sound} label="Sounds" text="A short chirp when you tick a set, and an alarm when it's time for the next one." onChange={(v) => { setSound(v); saveFeedback({ soundEnabled: v }); if (v) { unlockAudio(); soundSetDone(vol); } }} />
              {sound && (
                <div className="max-w-sm">
                  <Label htmlFor="vol">Volume</Label>
                  <input id="vol" type="range" min={10} max={100} step={5} value={vol} onChange={(e) => setVol(parseInt(e.target.value))} onPointerUp={() => { saveFeedback({ soundVolume: vol }); soundSetDone(vol); }} onKeyUp={() => saveFeedback({ soundVolume: vol })} className="w-full accent-primary" />
                  <div className="mt-3 flex gap-3"><button type="button" className="btn btn-outline-primary btn-sm" onClick={() => { unlockAudio(); soundSetDone(vol); }}>Test set sound</button><button type="button" className="btn btn-outline-primary btn-sm" onClick={() => { unlockAudio(); soundRestOver(vol); }}>Test rest alarm</button></div>
                </div>
              )}
              <Toggle on={vib} label="Vibration" text={vibOk ? "Vibrates when it's time for the next set." : "This device doesn't allow websites to vibrate (iPhones don't). Android phones do."} onChange={(v) => { setVib(v); saveFeedback({ vibrationEnabled: v }); if (v) vibrate(VIBRATE_REST_OVER); }} />
              {vib && vibOk && <div><button type="button" className="btn btn-outline-primary btn-sm" onClick={() => vibrate(VIBRATE_REST_OVER)}>Test vibration</button></div>}
              <Toggle on={awake} label="Keep the screen on during a workout" text="So the rest timer and its alarm keep running while your phone is on the bench." onChange={(v) => { setAwake(v); saveFeedback({ keepAwake: v }); }} />
            </div>
          </Card>

          <Card title="Music" text="Save your playlists once, then open them in your music app with one tap from the workout screen.">
            <MusicManager links={music} />
          </Card>

          <Card title="Phone app" text="Install Charge on your home screen: full screen, its own icon, and it opens fast.">
            <InstallApp />
          </Card>

          <Card title="Your data" text="Download a copy of what you saved: workouts, sets, food log, body numbers, recipes and plans. Progress photos, chat and community posts are not in it.">
            <div className="flex flex-wrap gap-3">
              <a className="btn btn-outline-primary btn-sm" href="/api/export" download data-testid="export-json">Download everything (JSON)</a>
              <a className="btn btn-outline-primary btn-sm" href="/api/export?format=csv" download data-testid="export-csv">Download all sets (CSV for a spreadsheet)</a>
            </div>
          </Card>

          <Card title="Delete account" text="This permanently deletes your profile, workouts and history. It cannot be undone.">
            <div className="rounded-lg border border-red-300 p-5 dark:border-red-900">
              <div className="grid max-w-sm gap-3">
                {hasPassword && <div><Label htmlFor="delpw">Your password</Label><input id="delpw" type="password" autoComplete="current-password" className="form-input !py-3" value={pw} onChange={(e) => setPw(e.target.value)} /></div>}
                <div><Label htmlFor="deltype">Type DELETE to confirm</Label><input id="deltype" className="form-input !py-3" value={typed} onChange={(e) => setTyped(e.target.value)} /></div>
                <button className="btn border-red-600 bg-red-600 text-white disabled:opacity-40" disabled={typed !== "DELETE" || (hasPassword && !pw)} onClick={deleteAccount}>Delete my account</button>
                {delMsg && <p role="alert" className="text-sm text-red-600">{delMsg}</p>}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
