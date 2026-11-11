"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleGeometry, Color, DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Raycaster, Scene, SphereGeometry, Vector2, Vector3, WebGLRenderer } from "three";

/**
 * A 3D body you can turn with your finger, mouse, arrow keys or the buttons. It is drawn with plain three.js from simple rounded
 * shapes (no model file to download), and every muscle group is its own piece that lights up by how much you trained it.
 * Anything that fails to start WebGL falls back to the flat drawing in BodyTraining.tsx through onUnsupported.
 */

type Part = { m?: string; p: [number, number, number]; s: [number, number, number]; rz?: number; mirror?: boolean };

// Metres, roughly: the figure is 1.8 tall, faces +z, and its left side is +x. `mirror` makes a copy on the other side.
const BASE: Part[] = [
  { p: [0, 1.67, 0.005], s: [0.105, 0.12, 0.11] },
  { p: [0, 1.32, 0], s: [0.2, 0.2, 0.1] },
  { p: [0, 1.06, 0], s: [0.16, 0.18, 0.09] },
  { p: [0, 0.88, 0], s: [0.18, 0.1, 0.1] },
  { p: [0.285, 1.2, 0], s: [0.052, 0.17, 0.052], rz: 0.1, mirror: true },
  { p: [0.33, 0.93, 0], s: [0.045, 0.15, 0.045], rz: 0.06, mirror: true },
  { p: [0.355, 0.74, 0], s: [0.04, 0.065, 0.025], mirror: true },
  { p: [0.105, 0.6, 0], s: [0.09, 0.24, 0.085], mirror: true },
  { p: [0.1, 0.25, 0], s: [0.06, 0.21, 0.055], mirror: true },
  { p: [0.1, 0.04, 0.05], s: [0.05, 0.035, 0.1], mirror: true },
];
const MUSCLES: Part[] = [
  { m: "neck", p: [0, 1.55, 0], s: [0.062, 0.07, 0.062] },
  { m: "traps", p: [0.085, 1.43, -0.05], s: [0.11, 0.065, 0.05], mirror: true },
  { m: "shoulders", p: [0.265, 1.4, 0], s: [0.08, 0.08, 0.08], mirror: true },
  { m: "chest", p: [0.098, 1.33, 0.08], s: [0.106, 0.09, 0.042], mirror: true },
  { m: "abdominals", p: [0, 1.07, 0.07], s: [0.07, 0.15, 0.04] },
  { m: "lats", p: [0.15, 1.2, -0.06], s: [0.07, 0.14, 0.05], mirror: true },
  { m: "middle back", p: [0, 1.28, -0.08], s: [0.085, 0.1, 0.04] },
  { m: "lower back", p: [0, 1.02, -0.07], s: [0.09, 0.075, 0.035] },
  { m: "biceps", p: [0.285, 1.2, 0.035], s: [0.045, 0.11, 0.04], rz: 0.1, mirror: true },
  { m: "triceps", p: [0.285, 1.2, -0.035], s: [0.045, 0.11, 0.04], rz: 0.1, mirror: true },
  { m: "forearms", p: [0.33, 0.94, 0], s: [0.05, 0.13, 0.05], rz: 0.06, mirror: true },
  { m: "glutes", p: [0.09, 0.84, -0.07], s: [0.095, 0.09, 0.08], mirror: true },
  { m: "abductors", p: [0.185, 0.8, 0], s: [0.03, 0.08, 0.05], mirror: true },
  { m: "adductors", p: [0.065, 0.56, 0.045], s: [0.04, 0.14, 0.045], mirror: true },
  { m: "quadriceps", p: [0.11, 0.62, 0.05], s: [0.075, 0.2, 0.06], mirror: true },
  { m: "hamstrings", p: [0.105, 0.58, -0.05], s: [0.07, 0.18, 0.06], mirror: true },
  { m: "calves", p: [0.1, 0.28, -0.03], s: [0.05, 0.14, 0.05], mirror: true },
];

/** Any CSS colour (hex, rgb, color-mix…) to a three.js Color, by letting a canvas do the parsing. */
let ctx2d: CanvasRenderingContext2D | null = null;
function cssColor(el: HTMLElement, name: string, fallback: string) {
  try {
    const probe = document.createElement("span");
    probe.style.color = `var(${name}, ${fallback})`; el.appendChild(probe);
    const resolved = getComputedStyle(probe).color; el.removeChild(probe);
    ctx2d ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!ctx2d) return new Color(fallback);
    ctx2d.clearRect(0, 0, 1, 1); ctx2d.fillStyle = "#000"; ctx2d.fillStyle = resolved; ctx2d.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx2d.getImageData(0, 0, 1, 1).data;
    return new Color(r / 255, g / 255, b / 255).convertSRGBToLinear();
  } catch { return new Color(fallback); }
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const PHI_MIN = 0.35, PHI_MAX = Math.PI - 0.35;
const TARGET = new Vector3(0, 0.9, 0);

export default function Body3D({ levels, sel, onPick, onUnsupported, label }: {
  /** 0 to 1 for each muscle group: how much of a good week's work it got */
  levels: Record<string, number>; sel: string | null; onPick: (m: string | null) => void; onUnsupported: () => void; label: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const canvasWrap = useRef<HTMLDivElement>(null);
  const api = useRef<{ nudge: (dTheta: number, dPhi: number) => void; face: (theta: number) => void; recolor: () => void; setSwing: (on: boolean) => void } | null>(null);
  const live = useRef({ levels, sel, onPick });
  live.current = { levels, sel, onPick };
  const [swing, setSwing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wrap = canvasWrap.current, root = host.current;
    if (!wrap || !root) return;
    let renderer: WebGLRenderer;
    try { renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch { onUnsupported(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const canvas = renderer.domElement;
    canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
    wrap.appendChild(canvas);

    const scene = new Scene();
    const camera = new PerspectiveCamera(28, 1, 0.1, 50);
    scene.add(camera);
    scene.add(new HemisphereLight(0xffffff, 0x8890a0, 1.35));
    const head = new DirectionalLight(0xffffff, 1.9); head.position.set(0.6, 0.8, 1); camera.add(head); // a light that follows the camera, so no side is ever dark

    const geo = new SphereGeometry(1, 28, 20);
    const shadow = new Mesh(new CircleGeometry(0.34, 40), new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; shadow.scale.set(1, 1, 1); scene.add(shadow);
    const baseMat = new MeshStandardMaterial({ roughness: 0.75, metalness: 0 });
    const meshes: Mesh[] = [], pickable: Mesh[] = [];
    const mats = new Map<string, MeshStandardMaterial[]>();
    const add = (pt: Part, sx: number) => {
      const mat = pt.m ? new MeshStandardMaterial({ roughness: 0.55, metalness: 0 }) : baseMat;
      const mesh = new Mesh(geo, mat);
      mesh.position.set(pt.p[0] * sx, pt.p[1], pt.p[2]); mesh.scale.set(...pt.s); mesh.rotation.z = (pt.rz ?? 0) * -sx;
      if (pt.m) { mesh.userData.m = pt.m; pickable.push(mesh); mats.set(pt.m, [...(mats.get(pt.m) ?? []), mat]); }
      scene.add(mesh); meshes.push(mesh);
    };
    for (const pt of [...BASE, ...MUSCLES]) { add(pt, 1); if (pt.mirror) add(pt, -1); }

    // ---- colours: read from the page, so light, dark and each section's accent just work
    const recolor = () => {
      const { levels: lv, sel: s } = live.current;
      const light = cssColor(root, "--sk-light", "#e6eaf0"), accent = cssColor(root, "--sk-accent", "#d7262e"), line = cssColor(root, "--sk-line", "#b8c0cc");
      const dark = light.r * 0.2126 + light.g * 0.7152 + light.b * 0.0722 < 0.12; // dark theme: the "untrained" colour is itself dark
      baseMat.color.copy(light).lerp(new Color(0, 0, 0), dark ? 0.55 : 0.42);
      void line;
      mats.forEach((list, m) => {
        const l = lv[m] ?? 0;
        for (const mat of list) {
          mat.color.copy(light);
          if (dark && l <= 0) mat.color.lerp(new Color(1, 1, 1), 0.1);
          if (l > 0) mat.color.lerp(accent, 0.3 + 0.7 * Math.min(1, l));
          if (m === s) { mat.emissive.copy(accent).multiplyScalar(0.28); } else mat.emissive.setRGB(0, 0, 0);
        }
      });
      request();
    };

    // ---- orbit state
    const st = { theta: 0.5, phi: Math.PI / 2 - 0.05, radius: 3.9, vT: 0, vP: 0, goT: null as number | null, goP: null as number | null, swing: false, dragging: false, t0: 0 };
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, running = false;
    const place = () => {
      camera.position.set(
        TARGET.x + st.radius * Math.sin(st.phi) * Math.sin(st.theta),
        TARGET.y + st.radius * Math.cos(st.phi),
        TARGET.z + st.radius * Math.sin(st.phi) * Math.cos(st.theta),
      );
      camera.lookAt(TARGET);
    };
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - (st.t0 || now)) / 1000); st.t0 = now;
      let moving = false;
      if (st.goT != null) { const d = st.goT - st.theta; if (Math.abs(d) < 0.002) { st.theta = st.goT; st.goT = null; } else { st.theta += d * Math.min(1, dt * (reduce ? 40 : 9)); moving = true; } }
      if (st.goP != null) { const d = st.goP - st.phi; if (Math.abs(d) < 0.002) { st.phi = st.goP; st.goP = null; } else { st.phi += d * Math.min(1, dt * (reduce ? 40 : 9)); moving = true; } }
      if (!st.dragging) {
        if (Math.abs(st.vT) > 0.01 || Math.abs(st.vP) > 0.01) { st.theta += st.vT * dt; st.phi = clamp(st.phi + st.vP * dt, PHI_MIN, PHI_MAX); const f = Math.pow(0.04, dt); st.vT *= f; st.vP *= f; moving = true; }
        else { st.vT = st.vP = 0; }
        if (st.swing && !reduce) { st.theta = 0.5 * Math.sin(now / 1100) * 1.6 + (st.goT ?? 0) * 0; st.phi = Math.PI / 2 - 0.05 + 0.12 * Math.sin(now / 1700); moving = true; }
      } else moving = true;
      place(); renderer.render(scene, camera);
      if (moving) raf = requestAnimationFrame(frame); else { running = false; st.t0 = 0; }
    };
    function request() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }

    // ---- size
    const resize = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h;
      st.radius = w / h < 0.85 ? 3.9 / Math.max(0.6, (w / h) / 0.85) ** 0.85 : 3.9;
      camera.updateProjectionMatrix(); request();
    };
    const ro = new ResizeObserver(resize); ro.observe(wrap);

    // ---- pointer: drag to turn, tap to pick a muscle
    const ray = new Raycaster(), ndc = new Vector2();
    let last = { x: 0, y: 0, t: 0 }, down = { x: 0, y: 0 }, moved = 0;
    const pickAt = (cx: number, cy: number) => {
      const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return (ray.intersectObjects(pickable, false)[0]?.object.userData.m as string | undefined) ?? null;
    };
    const onDown = (e: PointerEvent) => { canvas.setPointerCapture(e.pointerId); st.dragging = true; st.swing = false; setSwing(false); st.goT = st.goP = null; st.vT = st.vP = 0; last = { x: e.clientX, y: e.clientY, t: performance.now() }; down = { x: e.clientX, y: e.clientY }; moved = 0; canvas.style.cursor = "grabbing"; request(); };
    const onMove = (e: PointerEvent) => {
      if (!st.dragging) { const m = pickAt(e.clientX, e.clientY); canvas.style.cursor = m ? "pointer" : "grab"; return; }
      const now = performance.now(), dt = Math.max(1, now - last.t) / 1000;
      const dT = -(e.clientX - last.x) * 0.009, dP = -(e.clientY - last.y) * 0.009;
      st.theta += dT; st.phi = clamp(st.phi + dP, PHI_MIN, PHI_MAX);
      st.vT = dT / dt * 0.6 + st.vT * 0.4; st.vP = dP / dt * 0.6 + st.vP * 0.4;
      moved = Math.max(moved, Math.hypot(e.clientX - down.x, e.clientY - down.y)); last = { x: e.clientX, y: e.clientY, t: now };
    };
    const onUp = (e: PointerEvent) => {
      st.dragging = false; canvas.style.cursor = "grab";
      if (performance.now() - last.t > 80) { st.vT = st.vP = 0; }
      if (moved < 6) { st.vT = st.vP = 0; live.current.onPick(pickAt(e.clientX, e.clientY)); }
      request();
    };
    canvas.addEventListener("pointerdown", onDown); canvas.addEventListener("pointermove", onMove); canvas.addEventListener("pointerup", onUp); canvas.addEventListener("pointercancel", onUp);

    api.current = {
      nudge: (dT, dP) => { st.swing = false; setSwing(false); st.goT = (st.goT ?? st.theta) + dT; if (dP) st.goP = clamp((st.goP ?? st.phi) + dP, PHI_MIN, PHI_MAX); request(); },
      face: (t) => { st.swing = false; setSwing(false); const turns = Math.round((st.theta - t) / (Math.PI * 2)); st.goT = t + turns * Math.PI * 2; st.goP = Math.PI / 2 - 0.05; request(); },
      recolor,
      setSwing: (on) => { st.swing = on; request(); },
    };

    recolor(); resize(); place(); renderer.render(scene, camera); setReady(true);
    // light/dark or another section colour: look again when the page's class or style changes
    const mo = new MutationObserver(() => recolor());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    const cs = root.closest("[data-section]"); if (cs) mo.observe(cs, { attributes: true });

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); api.current = null;
      canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("pointercancel", onUp);
      geo.dispose(); shadow.geometry.dispose(); (shadow.material as MeshBasicMaterial).dispose(); baseMat.dispose(); mats.forEach((l) => l.forEach((m) => m.dispose())); renderer.dispose(); canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // new numbers or a new selection: repaint
  useEffect(() => { api.current?.recolor(); }, [levels, sel]);

  const key = useCallback((e: React.KeyboardEvent) => {
    const a = api.current; if (!a) return;
    const step = Math.PI / 6;
    if (e.key === "ArrowLeft") a.nudge(-step, 0); else if (e.key === "ArrowRight") a.nudge(step, 0);
    else if (e.key === "ArrowUp") a.nudge(0, -0.35); else if (e.key === "ArrowDown") a.nudge(0, 0.35);
    else if (e.key === "Escape") live.current.onPick(null); else return;
    e.preventDefault();
  }, []);

  const btn = "grid h-10 min-w-10 place-items-center rounded-full bg-[color:var(--sk-light)] px-3 text-sm font-bold transition hover:brightness-95 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  return (
    <div ref={host} data-testid="body3d" data-ready={ready}>
      <div ref={canvasWrap} tabIndex={0} role="application" aria-label={`${label}. Drag to turn the body, use the arrow keys, or tap a muscle.`} onKeyDown={key}
        className="relative mx-auto h-[420px] w-full max-w-[460px] rounded-2xl outline-offset-2 sm:h-[520px]">
        {!ready && <div className="skeleton absolute inset-0 rounded-2xl" aria-hidden />}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Turn the body">
        <button type="button" className={btn} onClick={() => api.current?.nudge(-Math.PI / 4, 0)} aria-label="Turn left">←</button>
        <button type="button" className={btn} onClick={() => api.current?.nudge(0, -0.4)} aria-label="Tilt up">↑</button>
        <button type="button" className={btn} onClick={() => api.current?.nudge(0, 0.4)} aria-label="Tilt down">↓</button>
        <button type="button" className={btn} onClick={() => api.current?.nudge(Math.PI / 4, 0)} aria-label="Turn right">→</button>
        <span className="mx-1 h-6 w-px bg-[color:var(--sk-line)]" aria-hidden />
        <button type="button" className={btn} onClick={() => api.current?.face(0)}>Front</button>
        <button type="button" className={btn} onClick={() => api.current?.face(Math.PI)}>Back</button>
        <button type="button" className={`${btn} ${swing ? "!bg-[color:var(--sk-accent)] !text-[color:var(--sk-ink)]" : ""}`} aria-pressed={swing} onClick={() => { const n = !swing; setSwing(n); api.current?.setSwing(n); }}>Swing</button>
      </div>
      <p className="mt-2 text-center text-xs text-text-light dark:text-darkmode-text-light">Drag to turn it, flick to spin. Tap a muscle to see its sets.</p>
    </div>
  );
}
