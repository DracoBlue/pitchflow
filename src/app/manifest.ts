import type { MetadataRoute } from "next";

import { BASE_PATH } from "@/basePath";

// Generate the manifest as a static file (required for output: export).
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pitchflow",
    short_name: "Pitchflow",
    description: "Gitarren-Rhythmusspiel: spiel echte Töne, triff die Noten.",
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: "standalone",
    orientation: "landscape",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: `${BASE_PATH}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${BASE_PATH}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
      {
        src: `${BASE_PATH}/icons/icon-512-maskable.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
