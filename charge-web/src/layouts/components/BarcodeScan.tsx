"use client";

import { lookupBarcode, type FoodHit, type Scanned } from "@/app/actions/food";
import { useEffect, useRef, useState } from "react";

type Found = { kind: "mine"; hit: FoodHit } | { kind: "off"; product: Scanned } | { kind: "none"; barcode: string };

type DetectorLike = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
declare global { interface Window { BarcodeDetector?: new (o: { formats: string[] }) => DetectorLike } }

/** Live camera that reads a barcode. Uses the browser's own detector when it has one, otherwise the zxing reader (loaded only when needed). */
function Camera({ onCode, onClose }: { onCode: (c: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let stop = false; let stream: MediaStream | null = null; let controls: { stop: () => void } | null = null; let raf = 0;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-camera");
        const el = video.current; if (!el) return;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stop) { stream.getTracks().forEach((t) => t.stop()); return; }
        el.srcObject = stream; await el.play();
        if (window.BarcodeDetector) {
          const det = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
          const tick = async () => {
            if (stop) return;
            try { const r = await det.detect(el); if (r[0]?.rawValue) { onCode(r[0].rawValue); return; } } catch { /* frame not ready */ }
            raf = window.setTimeout(tick, 200) as unknown as number;
          };
          void tick();
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
          if (stop) return;
          const hints = new Map().set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);
          const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
          const c = await reader.decodeFromStream(stream, el, (res) => { if (res && !stop) onCode(res.getText()); });
          controls = c;
          if (stop) c.stop();
        }
      } catch (e) {
        if (stop) return;
        const n = (e as Error).name;
        setErr(n === "NotAllowedError" ? "The camera is blocked. Allow it in your browser, or type the number instead." : "Couldn't start the camera here. Type the number under the barcode instead.");
      }
    })();
    return () => { stop = true; clearTimeout(raf); controls?.stop(); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onCode]);
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={video} className="aspect-[4/3] w-full object-cover" playsInline muted aria-label="Camera view" />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-white/80" aria-hidden />
      </div>
      {err ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{err}</p> : <p className="text-center text-sm text-text-light dark:text-darkmode-text-light">Hold the barcode inside the box.</p>}
      <button type="button" className="btn btn-outline-primary w-full" onClick={onClose}>Close camera</button>
    </div>
  );
}

/** The "Scan" tab: scan or type a barcode, find the food. */
export default function BarcodeScan({ onMine, onOff, onNone }: { onMine: (h: FoodHit) => void; onOff: (p: Scanned) => void; onNone: (barcode: string) => void }) {
  const [code, setCode] = useState("");
  const [cam, setCam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const busyRef = useRef(false);

  async function look(raw: string) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setMsg(""); setCam(false);
    const r = await lookupBarcode(raw);
    busyRef.current = false; setBusy(false);
    if (!r.ok) {
      if (r.reason === "invalid") return setMsg("A barcode has 8 to 14 digits. Check the number under the stripes.");
      if (r.reason === "offline") return setMsg("Couldn't reach the food database. Check your connection and try again.");
      return onNone(raw.replace(/\D/g, ""));
    }
    if (r.found === "mine") onMine(r.hit); else onOff(r.product);
  }
  const onCode = useRef((c: string) => void look(c));
  useEffect(() => { onCode.current = (c: string) => void look(c); });
  const stable = useRef((c: string) => onCode.current(c)).current;

  return (
    <div className="space-y-4 overflow-y-auto p-4">
      {cam ? <Camera onCode={stable} onClose={() => setCam(false)} /> : (
        <>
          <button type="button" className="btn btn-primary w-full" onClick={() => { setMsg(""); setCam(true); }}>Scan with camera</button>
          <form onSubmit={(e) => { e.preventDefault(); void look(code); }} className="space-y-2">
            <label htmlFor="barcode" className="form-label">Or type the number under the barcode</label>
            <div className="flex gap-2">
              <input id="barcode" inputMode="numeric" autoComplete="off" className="form-input grow tabular-nums" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 3017620422003" />
              <button className="btn btn-outline-primary" disabled={busy || code.replace(/\D/g, "").length < 8}>{busy ? "Looking…" : "Find"}</button>
            </div>
          </form>
        </>
      )}
      {busy && cam === false && <p role="status" className="text-sm text-text-light dark:text-darkmode-text-light">Looking it up…</p>}
      {msg && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{msg}</p>}
      <p className="text-xs text-text-light dark:text-darkmode-text-light">Product data comes from <a className="underline" href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">Open Food Facts</a>, shared under the Open Database Licence. Numbers are entered by volunteers, so check them against the label.</p>
    </div>
  );
}
