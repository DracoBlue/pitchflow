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

/** Gradierte Trefferfenster für verschiedene Schwierigkeitsgrade/Präzisionen. */
export const JUDGEMENT_THRESHOLDS = {
  perfect: { timing: 0.08, pitch: 10 }, // ± 80ms, ± 10 Cents
  good: { timing: 0.18, pitch: 30 },    // ± 180ms, ± 30 Cents
};

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

/**
 * Bewertet einen Treffer basierend auf Timing und Pitch.
 * Gibt ein Resultat ("perfect", "good", "miss") zurück.
 */
export function evaluateHit(
  note: { note: string; time: number; stringIdx: number },
  actualTime: number,
  actualHz: number
): "perfect" | "good" | "miss" {
  const timingDiff = Math.abs(note.time - actualTime);
  const targetHz = noteToFrequency(parseNote(note.note));
  const pitchDiff = Math.abs(centsBetween(actualHz, targetHz));

  if (timingDiff <= JUDGEMENT_THRESHOLDS.perfect.timing && pitchDiff <= JUDGEMENT_THRESHOLDS.perfect.pitch) {
    return "perfect";
  }
  if (timingDiff <= JUDGEMENT_THRESHOLDS.good.timing && pitchDiff <= JUDGEMENT_THRESHOLDS.good.pitch) {
    return "good";
  }
  return "miss";
}

export function isPitchMatch(frequency: number, targetNote: string): boolean {
  const midi = parseNote(targetNote);
  if (midi === null) return false;
  return Math.abs(centsBetween(frequency, noteToFrequency(midi))) <= PITCH_WINDOW_CENTS;
}
