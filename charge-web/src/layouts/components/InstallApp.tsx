"use client";

import { useEffect, useState } from "react";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** "Install the app" helper: Android/desktop Chrome get a real install button, iPhone gets the Add to Home Screen steps. */
export default function InstallApp() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    const onInstalled = () => { setInstalled(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (installed) return <p className="text-sm">You&apos;re using the installed app. 🎉</p>;
  if (evt) return <button className="btn btn-primary" onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null); }}>Install Charge on this device</button>;
  if (ios) return (
    <ol className="list-decimal space-y-1 pl-5 text-sm">
      <li>Open this site in <b>Safari</b>.</li>
      <li>Tap the <b>Share</b> button (square with an arrow).</li>
      <li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>
    </ol>
  );
  return <p className="text-sm">Open this site in Chrome or Edge, then use the browser menu → <b>Install app</b> (or <b>Add to Home screen</b> on Android).</p>;
}
