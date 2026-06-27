/**
 * Hit window: timing × pitch.
 * Generous starting values — low strings need a long analysis window,
 * better a wide window than frustrating misreadings (briefing §8).
 */
import type { PitchReading } from "@/audio/messages";
import { noteToFrequency, parseNote } from "@/audio/noteMapper";

/** ± seconds around the note time within which a tone counts as a hit. */
export const TIMING_WINDOW_S = 0.25;
/** ± cents around the target tone. */
export const PITCH_WINDOW_CENTS = 30;

/** Graded hit windows for different difficulties/precisions. */
export const JUDGEMENT_THRESHOLDS = {
  perfect: { timing: 0.08, pitch: 10 }, // ± 80ms, ± 10 cents
  good: { timing: 0.18, pitch: 30 },    // ± 180ms, ± 30 cents
};

/**
 * Flat input latency (capture + half the analysis window), subtracted from the
 * reading time so that the pick timing is evaluated.
 */
export const INPUT_LATENCY_S = 0.06;
/** Noise gate, same starting values as in the tuner. */
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
 * Evaluates a hit based on timing and pitch.
 * Returns a result ("perfect", "good", "miss").
 */
export function evaluateHit(
  note: { note: string; time: number },
  actualTime: number,
  actualHz: number
): "perfect" | "good" | "miss" {
  const midi = parseNote(note.note);
  if (midi === null) return "miss";
  const timingDiff = Math.abs(note.time - actualTime);
  const targetHz = noteToFrequency(midi);
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
