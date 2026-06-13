import type { NextConfig } from "next";

// Beim Deploy auf GitHub Pages liegt die App unter /<repo> — z.B. /pitchflow.
// Lokal ist NEXT_PUBLIC_BASE_PATH leer, dann läuft alles unter "/".
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Rein statischer Export (kein Server-Code) → nach out/, deploybar auf Pages.
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
