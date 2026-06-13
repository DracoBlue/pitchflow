/**
 * Canvas-Texturen für die Beschriftung der Noten-Blöcke:
 * Bund groß (0 = leere Saite), Notenname klein darunter.
 * Bewusst ohne 3D-Text-Lib (troika lädt Fonts zur Laufzeit nach — schlecht
 * für die PWA). Texturen werden pro Label gecacht.
 */
import { CanvasTexture, SRGBColorSpace } from "three";

const cache = new Map<string, CanvasTexture>();

export function noteLabelTexture(note: string, fret: number | null): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const key = `${fret ?? "-"}·${note}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";

  const drawLine = (text: string, y: number, fontSize: number) => {
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.lineWidth = fontSize * 0.13;
    ctx.strokeText(text, 256, y);
    ctx.fillText(text, 256, y);
  };

  if (fret !== null) {
    // Bund dominant und groß — das ist die Information, die man beim Greifen braucht.
    ctx.fillStyle = "#ffffff";
    drawLine(String(fret), 104, 215);
    ctx.fillStyle = "#a1a1aa";
    drawLine(note, 228, 52);
  } else {
    ctx.fillStyle = "#ffffff";
    drawLine(note, 136, 170);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}
