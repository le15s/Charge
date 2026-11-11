"use client";

/**
 * Sounds and vibration for the workout tracker.
 * The sounds are synthesized with the Web Audio API (no audio files, no licences to worry about).
 * Browsers only allow audio after a tap, so call unlockAudio() from a click handler (ticking a set does this).
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
}

/** `to` makes the pitch glide from `f` to `to` over the note. */
type Note = { f: number; at: number; dur: number; type?: OscillatorType; gain?: number; to?: number };

function play(notes: Note[], volume: number) {
  const c = getCtx();
  if (!c || volume <= 0) return;
  if (c.state === "suspended") void c.resume();
  const master = c.createGain();
  master.gain.value = Math.min(1, Math.max(0, volume / 100)) * 0.6;
  master.connect(c.destination);
  const t0 = c.currentTime + 0.01;
  for (const n of notes) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = n.type ?? "sine";
    o.frequency.setValueAtTime(n.f, t0 + n.at);
    if (n.to) o.frequency.exponentialRampToValueAtTime(n.to, t0 + n.at + n.dur);
    const peak = n.gain ?? 1;
    g.gain.setValueAtTime(0.0001, t0 + n.at);
    g.gain.exponentialRampToValueAtTime(peak, t0 + n.at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
    o.connect(g); g.connect(master);
    o.start(t0 + n.at); o.stop(t0 + n.at + n.dur + 0.02);
  }
}

/** Short, bright "set done" chirp. */
export function soundSetDone(volume: number) {
  play([
    { f: 660, at: 0, dur: 0.11, type: "triangle" },
    { f: 990, at: 0.08, dur: 0.18, type: "triangle", gain: 0.9 },
  ], volume);
}

/** Rest is over: three quick beeps and a longer one, hard to miss between sets. */
export function soundRestOver(volume: number) {
  play([
    { f: 880, at: 0, dur: 0.14, type: "square", gain: 0.5 },
    { f: 880, at: 0.22, dur: 0.14, type: "square", gain: 0.5 },
    { f: 880, at: 0.44, dur: 0.14, type: "square", gain: 0.5 },
    { f: 1175, at: 0.68, dur: 0.38, type: "square", gain: 0.55 },
  ], volume);
}

/*
 * One sound per action, so you can tell what happened without looking:
 *  - add a set: two rising soft notes      - remove a set: a low falling thud
 *  - +15 s: a quick bright upward blip      - -15 s: a quick lower downward blip
 *  - skip the rest: a fast airy swoosh      - un-tick a set: one soft low tick
 *  - change set type: a tiny click          - finish the workout: a four-note fanfare
 */
export function soundAddSet(volume: number) {
  play([{ f: 440, at: 0, dur: 0.1, type: "sine", gain: 0.8 }, { f: 660, at: 0.07, dur: 0.16, type: "sine", gain: 0.8 }], volume);
}
export function soundRemoveSet(volume: number) {
  play([{ f: 300, to: 130, at: 0, dur: 0.2, type: "triangle", gain: 0.9 }], volume);
}
export function soundPlus15(volume: number) {
  play([{ f: 1000, at: 0, dur: 0.06, type: "sine", gain: 0.7 }, { f: 1500, at: 0.05, dur: 0.1, type: "sine", gain: 0.7 }], volume);
}
export function soundMinus15(volume: number) {
  play([{ f: 700, at: 0, dur: 0.06, type: "sine", gain: 0.7 }, { f: 470, at: 0.05, dur: 0.1, type: "sine", gain: 0.7 }], volume);
}
export function soundSkip(volume: number) {
  play([{ f: 400, to: 1800, at: 0, dur: 0.16, type: "sawtooth", gain: 0.18 }, { f: 1800, to: 900, at: 0.1, dur: 0.1, type: "sine", gain: 0.3 }], volume);
}
export function soundUntick(volume: number) {
  play([{ f: 330, at: 0, dur: 0.09, type: "sine", gain: 0.8 }], volume);
}
export function soundKind(volume: number) {
  play([{ f: 1200, at: 0, dur: 0.03, type: "square", gain: 0.25 }], volume);
}
export function soundFinish(volume: number) {
  play([
    { f: 523, at: 0, dur: 0.16, type: "triangle" }, { f: 659, at: 0.13, dur: 0.16, type: "triangle" },
    { f: 784, at: 0.26, dur: 0.16, type: "triangle" }, { f: 1047, at: 0.39, dur: 0.5, type: "triangle", gain: 0.95 },
  ], volume);
}

export const canVibrate = () => typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
export function vibrate(pattern: number | number[]) { if (canVibrate()) try { navigator.vibrate(pattern); } catch { /* ignore */ } }
export const VIBRATE_SET = 25;
export const VIBRATE_REST_OVER = [250, 120, 250, 120, 500];

export type FeedbackPrefs = { soundEnabled: boolean; vibrationEnabled: boolean; soundVolume: number; keepAwake: boolean };
