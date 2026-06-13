/**
 * Message protocol between the pitch AudioWorklet and the main thread.
 */
export type PitchReading = {
  /** Detected fundamental frequency in Hz (NaN if none found). */
  frequency: number;
  /** MPM clarity 0..1 — how periodic/confident the detection is. */
  clarity: number;
  /** RMS level of the analysis window (linear, 0..1). */
  rms: number;
  /** AudioContext time (seconds) at the end of the analysis window. */
  time: number;
};
