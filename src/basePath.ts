/**
 * Basis-Pfad der App. Lokal leer (App liegt unter "/"), beim Deploy auf
 * GitHub Pages "/pitchflow" (gesetzt via NEXT_PUBLIC_BASE_PATH im Workflow).
 *
 * Für alle hartkodierten absoluten URLs nötig, die Next.js NICHT automatisch
 * mit dem basePath versieht (Worklet, Service Worker, Manifest-Icons, songs.json).
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
