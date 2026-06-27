"use client";

import { useEffect } from "react";

import { BASE_PATH } from "@/basePath";

/**
 * Registers <basePath>/sw.js — only in the production build, so the cache
 * doesn't interfere during development. Test PWA behavior with
 * `pnpm build && pnpm start`.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`${BASE_PATH}/sw.js`).catch((err) => {
      console.error("Service-Worker-Registrierung fehlgeschlagen:", err);
    });
  }, []);
  return null;
}
