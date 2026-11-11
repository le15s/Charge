"use client";

import { useEffect } from "react";

/** Registers the service worker (production only) so the site can be installed as a phone app. */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { /* not critical */ });
  }, []);
  return null;
}
