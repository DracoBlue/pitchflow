/**
 * Frequency (Hz) → musical note mapping, equal temperament, A4 = 440 Hz.
 */
export type NoteInfo = {
  /** e.g. "E", "F#" */
  name: string;
  /** Scientific pitch notation octave, e.g. 2 for E2. */
  octave: number;
  /** Full label, e.g. "E2". */
  label: string;
  /** Deviation from the exact note in cents (-50..+50). */
  cents: number;
  /** Rounded MIDI note number. */
  midi: number;
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function frequencyToNote(frequency: number): NoteInfo | null {
  if (!Number.isFinite(frequency) || frequency <= 0) return null;
  const midiExact = 69 + 12 * Math.log2(frequency / 440);
  const midi = Math.round(midiExact);
  if (midi < 0 || midi > 127) return null;
  const cents = (midiExact - midi) * 100;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { name, octave, label: `${name}${octave}`, cents, midi };
}

export function noteToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const NOTE_OFFSETS: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

/** "E2", "F#3", "Bb1" → MIDI note number, null if not parsable. */
export function parseNote(label: string): number | null {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(label.trim());
  if (!match) return null;
  const [, letter, accidental, octave] = match;
  const offset = NOTE_OFFSETS[letter] + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0);
  const midi = (Number(octave) + 1) * 12 + offset;
  return midi >= 0 && midi <= 127 ? midi : null;
}

/** Standard tuning, low to high. */
export const GUITAR_STRINGS = [
  { string: 6, label: "E2", frequency: 82.41 },
  { string: 5, label: "A2", frequency: 110.0 },
  { string: 4, label: "D3", frequency: 146.83 },
  { string: 3, label: "G3", frequency: 196.0 },
  { string: 2, label: "B3", frequency: 246.94 },
  { string: 1, label: "E4", frequency: 329.63 },
] as const;

/** String number (6 = low E string … 1 = high E string) for open strings, otherwise null. */
export function stringNumberForNote(label: string): number | null {
  return GUITAR_STRINGS.find((s) => s.label === label)?.string ?? null;
}

/**
 * Fret at which the note is fingered on the given string
 * (0 = open string), null if the note is not playable there.
 */
export function fretForNote(label: string, stringNumber: number): number | null {
  const open = GUITAR_STRINGS.find((s) => s.string === stringNumber);
  const noteMidi = parseNote(label);
  const openMidi = open ? parseNote(open.label) : null;
  if (noteMidi === null || openMidi === null) return null;
  const fret = noteMidi - openMidi;
  return fret >= 0 && fret <= 24 ? fret : null;
}
