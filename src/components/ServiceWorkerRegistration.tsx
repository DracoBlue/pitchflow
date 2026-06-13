"use client";

import { useEffect } from "react";

/**
 * Registriert /sw.js — nur im Production-Build, damit der Cache
 * beim Entwickeln nicht dazwischenfunkt. PWA-Verhalten daher mit
 * `pnpm build && pnpm start` testen.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service-Worker-Registrierung fehlgeschlagen:", err);
    });
  }, []);
  return null;
}
