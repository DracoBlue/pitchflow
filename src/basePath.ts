/**
 * Base path of the app. Empty locally (app lives under "/"), "/pitchflow" when
 * deployed to GitHub Pages (set via NEXT_PUBLIC_BASE_PATH in the workflow).
 *
 * Needed for all hardcoded absolute URLs that Next.js does NOT automatically
 * prefix with the base path (worklet, service worker, manifest icons, songs.json).
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
