/**
 * Trefferfenster: Timing × Tonhöhe.
 * Großzügige Startwerte — tiefe Saiten brauchen ein langes Analysefenster,
 * lieber ein weites Fenster als frustige Fehlmessungen (Briefing §8).
 */
import type { PitchReading } from "@/audio/messages";
import { noteToFrequency, parseNote } from "@/audio/noteMapper";

/** ± Sekunden um die Notenzeit, in denen ein Ton als Treffer zählt. */
export const TIMING_WINDOW_S = 0.25;
/** ± Cent um den Zielton. */
export const PITCH_WINDOW_CENTS = 30;
/**
 * Pauschale Eingangslatenz (Capture + halbes Analysefenster), wird von der
 * Reading-Zeit abgezogen, damit der Anschlagszeitpunkt bewertet wird.
 */
export const INPUT_LATENCY_S = 0.06;
/** Noise-Gate, gleiche Startwerte wie im Tuner. */
export const MIN_CLARITY = 0.9;
export const MIN_RMS = 0.01;

export function isReadingUsable(reading: PitchReading): boolean {
  return (
    Number.isFinite(reading.frequency) &&
    reading.frequency > 0 &&
    reading.clarity >= MIN_CLARITY &&
    reading.rms >= MIN_RMS
  );
}

export function centsBetween(frequency: number, targetHz: number): number {
  return 1200 * Math.log2(frequency / targetHz);
}

export function isPitchMatch(frequency: number, targetNote: string): boolean {
  const midi = parseNote(targetNote);
  if (midi === null) return false;
  return Math.abs(centsBetween(frequency, noteToFrequency(midi))) <= PITCH_WINDOW_CENTS;
}
