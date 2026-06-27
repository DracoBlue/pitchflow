/** Level definition: notes with target time (seconds from game start). */
export type ChartNote = {
  /** Time in seconds at which the note reaches the hit line. */
  time: number;
  /** Target note, e.g. "E2". */
  note: string;
  /**
   * String 6 (low E) … 1 (high E). Determines the lane.
   * Optional for open strings (derived from the note), required for fretted
   * notes, since pitch alone does not fix the string.
   */
  string?: number;
  /** Sounding length in seconds — determines the block length. Absent = short. */
  duration?: number;
};

/** 1 = beginner … 4 = advanced. */
export type Difficulty = 1 | 2 | 3 | 4;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: "Einstieg",
  2: "Leicht",
  3: "Mittel",
  4: "Fortgeschritten",
};

export type Chart = {
  id: string;
  title: string;
  /** Short description for the song selection. */
  description: string;
  difficulty: Difficulty;
  bpm: number;
  notes: ChartNote[];
};

/** Even note sequence from start time (uniform tempo = beginner-friendly). */
function sequence(
  startTime: number,
  spacing: number,
  notes: Array<{ note: string; string?: number }>
): ChartNote[] {
  return notes.map((n, i) => ({ time: startTime + i * spacing, ...n }));
}

const OPEN_STRINGS = [
  { note: "E2" },
  { note: "A2" },
  { note: "D3" },
  { note: "G3" },
  { note: "B3" },
  { note: "E4" },
];

/** Melodies in the C4–A4 range: C/D on the B string (2), rest on the high E string (1). */
const hi = (note: string): { note: string; string: number } => ({
  note,
  string: note === "C4" || note === "D4" ? 2 : 1,
});

/** Tuples [note, string] → ChartNote inputs. */
const tuples = (pairs: Array<[string, number]>) =>
  pairs.map(([note, string]) => ({ note, string }));

/**
 * Beat-based note sequence: each note has a length in beats, default 1.
 * Onset times and duration derive from the tempo — so a "long" note
 * (e.g. beats: 2) automatically becomes a longer block and the next note
 * comes correspondingly later.
 */
export function melody(
  startTime: number,
  secondsPerBeat: number,
  notes: Array<{ note: string; string?: number; beats?: number }>
): ChartNote[] {
  let t = startTime;
  return notes.map((n) => {
    const beats = n.beats ?? 1;
    const chartNote: ChartNote = {
      time: t,
      note: n.note,
      string: n.string,
      duration: beats * secondsPerBeat,
    };
    t += beats * secondsPerBeat;
    return chartNote;
  });
}

// ─── Level 1: Beginner — open strings only ─────────────────────────────────

const LEERSAITEN_DRILL: Chart = {
  id: "leersaiten-drill",
  title: "Leersaiten-Drill",
  description: "Jede offene Saite der Reihe nach, zweimal durch — E A D G B E.",
  difficulty: 1,
  bpm: 60,
  notes: sequence(2, 2, [...OPEN_STRINGS, ...OPEN_STRINGS]),
};

const E_A_WECHSEL: Chart = {
  id: "e-a-wechsel",
  title: "E- und A-Saite im Wechsel",
  description: "Nur die zwei tiefen Saiten — gut zum Eingrooven.",
  difficulty: 1,
  bpm: 60,
  notes: sequence(2, 2, [
    { note: "E2" },
    { note: "E2" },
    { note: "A2" },
    { note: "E2" },
    { note: "A2" },
    { note: "A2" },
    { note: "E2" },
    { note: "A2" },
  ]),
};

// ─── Level 2: Easy — few notes, one or two strings ──────────────────────────

// Three notes, all on the G string (G3 open, A3 2nd fret, B3 4th fret).
const HOT_CROSS_BUNS: Chart = {
  id: "hot-cross-buns",
  title: "Hot Cross Buns",
  description: "Der absolute Klassiker: nur drei Töne auf einer Saite.",
  difficulty: 2,
  bpm: 60,
  notes: sequence(
    2,
    1.2,
    ["B3", "A3", "G3", "B3", "A3", "G3", "G3", "G3", "G3", "G3", "A3", "A3", "A3", "A3", "B3", "A3", "G3"].map(
      (note) => ({ note, string: 3 })
    )
  ),
};

const MARY_LAMB: Chart = {
  id: "mary-lamb",
  title: "Mary Had a Little Lamb",
  description: "Vier Töne auf B- und hoher E-Saite, ruhiges Tempo.",
  difficulty: 2,
  bpm: 60,
  notes: sequence(
    2,
    1.2,
    ["E4", "D4", "C4", "D4", "E4", "E4", "E4", "D4", "D4", "D4", "E4", "G4", "G4",
     "E4", "D4", "C4", "D4", "E4", "E4", "E4", "E4", "D4", "D4", "E4", "D4", "C4"].map(hi)
  ),
};

// ─── Level 3: Medium — complete melodies ────────────────────────────────────

const ALLE_MEINE_ENTCHEN: Chart = {
  id: "alle-meine-entchen",
  title: "Alle meine Entchen",
  description: "Komplette Melodie, C-Dur — läuft schön die Saiten hinauf.",
  difficulty: 3,
  bpm: 60,
  notes: sequence(
    2,
    1.1,
    ["C4", "D4", "E4", "F4", "G4", "G4", "A4", "A4", "A4", "A4", "G4",
     "A4", "A4", "A4", "A4", "G4", "F4", "F4", "F4", "F4", "E4", "E4",
     "D4", "D4", "D4", "D4", "C4"].map(hi)
  ),
};

const TWINKLE: Chart = {
  id: "twinkle",
  title: "Twinkle Twinkle Little Star",
  description: "Bekannte Melodie (= ABC-Lied), volle Strophe.",
  difficulty: 3,
  bpm: 60,
  notes: sequence(
    2,
    1.2,
    ["C4", "C4", "G4", "G4", "A4", "A4", "G4", "F4", "F4", "E4", "E4", "D4", "D4", "C4",
     "G4", "G4", "F4", "F4", "E4", "E4", "D4", "G4", "G4", "F4", "F4", "E4", "E4", "D4",
     "C4", "C4", "G4", "G4", "A4", "A4", "G4", "F4", "F4", "E4", "E4", "D4", "D4", "C4"].map(hi)
  ),
};

// First line of "Ode an die Freude" (Beethoven, public domain).
const ODE_AN_DIE_FREUDE: Chart = {
  id: "ode-an-die-freude",
  title: "Ode an die Freude",
  description: "Erste Zeile, langsam — gegriffene Töne auf B- und hoher E-Saite.",
  difficulty: 3,
  bpm: 40,
  notes: sequence(
    2,
    1.5,
    ["E4", "E4", "F4", "G4", "G4", "F4", "E4", "D4", "C4", "C4", "D4", "E4", "E4", "D4", "D4"].map(hi)
  ),
};

// ─── Level 4: Advanced — scales across multiple strings ─────────────────────

// Classic C major scale in first position, up and down (strings 5–2).
const C_DUR_TONLEITER: Chart = {
  id: "c-dur-tonleiter",
  title: "C-Dur-Tonleiter",
  description: "Erste Lage, hoch und runter — trainiert den Saitenwechsel.",
  difficulty: 4,
  bpm: 60,
  notes: sequence(
    2,
    1.0,
    tuples([
      ["C3", 5], ["D3", 4], ["E3", 4], ["F3", 4], ["G3", 3], ["A3", 3], ["B3", 2], ["C4", 2],
      ["B3", 2], ["A3", 3], ["G3", 3], ["F3", 4], ["E3", 4], ["D3", 4], ["C3", 5],
    ])
  ),
};

// E minor pentatonic (the "rock scale"), open position across all six strings.
const EM_PENTATONIK: Chart = {
  id: "em-pentatonik",
  title: "E-Moll-Pentatonik",
  description: "Die Rock-Tonleiter — über alle sechs Saiten, hoch und runter.",
  difficulty: 4,
  bpm: 66,
  notes: sequence(
    2,
    1.0,
    tuples([
      ["E2", 6], ["G2", 6], ["A2", 5], ["B2", 5], ["D3", 4], ["E3", 4],
      ["G3", 3], ["A3", 3], ["B3", 2], ["D4", 2], ["E4", 1],
      ["D4", 2], ["B3", 2], ["A3", 3], ["G3", 3], ["E3", 4], ["D3", 4],
      ["B2", 5], ["A2", 5], ["G2", 6], ["E2", 6],
    ])
  ),
};

// ─── Rhythm levels: variable note lengths via melody() ──────────────────────

// Deliberate rhythm trainer on the two low strings: quarters, halves,
// eighths alternating — the pulse stays, the lengths change.
const RHYTHMUS_DRILL: Chart = {
  id: "rhythmus-drill",
  title: "Rhythmus-Drill",
  description: "E- und A-Saite mit wechselnden Notenlängen — Gefühl für Timing.",
  difficulty: 2,
  bpm: 80,
  notes: melody(2, 0.55, [
    { note: "E2", beats: 1 }, { note: "E2", beats: 1 }, { note: "A2", beats: 2 },
    { note: "E2", beats: 0.5 }, { note: "E2", beats: 0.5 }, { note: "A2", beats: 1 }, { note: "A2", beats: 2 },
    { note: "E2", beats: 1 }, { note: "A2", beats: 0.5 }, { note: "A2", beats: 0.5 }, { note: "E2", beats: 2 },
    { note: "A2", beats: 0.5 }, { note: "A2", beats: 0.5 }, { note: "E2", beats: 0.5 }, { note: "E2", beats: 0.5 }, { note: "A2", beats: 2 },
  ]),
};

// "Bruder Jakob" (public domain) as a canon melody with real rhythm:
// eighths in the "ding ding dong" run, halves at the phrase end.
const j = (note: string, beats?: number) => ({ ...hi(note), beats });
const BRUDER_JAKOB: Chart = {
  id: "bruder-jakob",
  title: "Bruder Jakob",
  description: "Bekannter Kanon mit echtem Rhythmus — Achtel und Halbe gemischt.",
  difficulty: 3,
  bpm: 90,
  notes: melody(2, 0.7, [
    // "Bruder Jakob" (×2)
    j("C4"), j("D4"), j("E4"), j("C4"),
    j("C4"), j("D4"), j("E4"), j("C4"),
    // "Schläfst du noch?" (×2)
    j("E4"), j("F4"), j("G4", 2),
    j("E4"), j("F4"), j("G4", 2),
    // "Ding ding dong" (×2)
    j("G4", 0.5), j("A4", 0.5), j("G4", 0.5), j("F4", 0.5), j("E4"), j("C4"),
    j("G4", 0.5), j("A4", 0.5), j("G4", 0.5), j("F4", 0.5), j("E4"), j("C4"),
    // "Bim bam bum" (×2)
    j("C4"), { note: "G3", string: 3, beats: 1 }, j("C4", 2),
    j("C4"), { note: "G3", string: 3, beats: 1 }, j("C4", 2),
  ]),
};

// ─── Vogelfänger (Mozart KV 620, public domain) ─────────────────────────────

// "Der Vogelfänger bin ich ja" — vocal melody (notes 1–40), G major, 1st position.
const VOGELFAENGER: Chart = {
  id: "vogelfaenger",
  title: "Der Vogelfänger",
  description: "Papageno-Arie (Mozart KV 620). Gesangsmelodie, G-Dur, 1. Lage.",
  difficulty: 3,
  bpm: 133,
  notes: melody(2, 0.45, [
    { note: "B3", string: 2 }, { note: "A3", string: 3 }, { note: "G3", string: 3 }, { note: "G3", string: 3 },
    { note: "A3", string: 3 }, { note: "G3", string: 3 }, { note: "F#3", string: 4 }, { note: "G3", string: 3 },
    { note: "A3", string: 3 }, { note: "B3", string: 2 }, { note: "A3", string: 3 }, { note: "A3", string: 3 },
    { note: "F#3", string: 4 }, { note: "D3", string: 4 }, { note: "D3", string: 4 }, { note: "D4", string: 2 },
    { note: "D4", string: 2 }, { note: "B3", string: 2 }, { note: "A3", string: 3 }, { note: "G3", string: 3 },
    { note: "B3", string: 2 }, { note: "A3", string: 3 }, { note: "G3", string: 3 }, { note: "F#3", string: 4 },
    { note: "G3", string: 3 }, { note: "A3", string: 3 }, { note: "G3", string: 3 }, { note: "F#3", string: 4 },
    { note: "G3", string: 3 }, { note: "A3", string: 3 }, { note: "B3", string: 2 }, { note: "A3", string: 3 },
    { note: "A3", string: 3 }, { note: "D4", string: 2 }, { note: "D4", string: 2 }, { note: "A3", string: 3 },
    { note: "A3", string: 3 }, { note: "F#3", string: 4 }, { note: "E3", string: 4 }, { note: "D3", string: 4 },
  ]),
};

// The instrumental interlude of the aria (notes 41–89).
const VOGELFAENGER_ZWISCHENSPIEL: Chart = {
  id: "vogelfaenger-zwischenspiel",
  title: "Der Vogelfänger – Zwischenspiel",
  description: "Das instrumentale Zwischenspiel der Papageno-Arie (Mozart KV 620).",
  difficulty: 4,
  bpm: 133,
  notes: melody(2, 0.45, [
    { note: "D3", string: 4 }, { note: "F#3", string: 4 }, { note: "A3", string: 3 }, { note: "A3", string: 3 },
    { note: "B3", string: 2 }, { note: "A3", string: 3 }, { note: "G3", string: 3 }, { note: "A3", string: 3 },
    { note: "B3", string: 2 }, { note: "A3", string: 3 }, { note: "G3", string: 3 }, { note: "D4", string: 2 },
    { note: "F#3", string: 4 }, { note: "F#3", string: 4 }, { note: "A3", string: 3 }, { note: "G3", string: 3 },
    { note: "F#3", string: 4 }, { note: "G3", string: 3 }, { note: "A3", string: 3 }, { note: "B3", string: 2 },
    { note: "A3", string: 3 }, { note: "G3", string: 3 }, { note: "A3", string: 3 }, { note: "B3", string: 2 },
    { note: "C4", string: 2 }, { note: "D4", string: 2 }, { note: "G3", string: 3 }, { note: "A3", string: 3 },
    { note: "B3", string: 2 }, { note: "B3", string: 2 }, { note: "C4", string: 2 }, { note: "B3", string: 2 },
    { note: "A3", string: 3 }, { note: "B3", string: 2 }, { note: "C4", string: 2 }, { note: "D4", string: 2 },
    { note: "E4", string: 1 }, { note: "C4", string: 2 }, { note: "A3", string: 3 }, { note: "F#3", string: 4 },
    { note: "F#3", string: 4 }, { note: "G3", string: 3 }, { note: "F#3", string: 4 }, { note: "E3", string: 4 },
    { note: "F#3", string: 4 }, { note: "G3", string: 3 }, { note: "A3", string: 3 }, { note: "F#3", string: 4 },
    { note: "G3", string: 3 },
  ]),
};

/**
 * Scales a chart to a tempo: speed > 1 faster (notes closer together),
 * speed < 1 slower (more air between the notes).
 * Hit windows (in seconds) stay constant — slower = more calm.
 */
export function scaleChartSpeed(chart: Chart, speed: number): Chart {
  if (speed === 1) return chart;
  return {
    ...chart,
    notes: chart.notes.map((n) => ({
      ...n,
      time: n.time / speed,
      duration: n.duration != null ? n.duration / speed : undefined,
    })),
  };
}

export const CHARTS: Chart[] = [
  LEERSAITEN_DRILL,
  E_A_WECHSEL,
  HOT_CROSS_BUNS,
  MARY_LAMB,
  RHYTHMUS_DRILL,
  ALLE_MEINE_ENTCHEN,
  TWINKLE,
  ODE_AN_DIE_FREUDE,
  BRUDER_JAKOB,
  VOGELFAENGER,
  VOGELFAENGER_ZWISCHENSPIEL,
  C_DUR_TONLEITER,
  EM_PENTATONIK,
];
