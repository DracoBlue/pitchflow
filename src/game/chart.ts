/** Level-Definition: Noten mit Zielzeit (Sekunden ab Spielstart). */
export type ChartNote = {
  /** Zeitpunkt in Sekunden, zu dem die Note die Trefferlinie erreicht. */
  time: number;
  /** Zielton, z.B. "E2". */
  note: string;
  /**
   * Saite 6 (tiefes E) … 1 (hohes E). Bestimmt die Lane.
   * Für offene Saiten optional (wird aus dem Ton ermittelt), für gegriffene
   * Töne Pflicht, weil die Tonhöhe allein die Saite nicht festlegt.
   */
  string?: number;
  /** Klingende Länge in Sekunden — bestimmt die Block-Länge. Fehlt = kurz. */
  duration?: number;
};

/** 1 = Einstieg … 4 = Fortgeschritten. */
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
  /** Kurze Beschreibung für die Liedauswahl. */
  description: string;
  difficulty: Difficulty;
  bpm: number;
  notes: ChartNote[];
};

/** Gleichmäßige Notenfolge ab Startzeit (uniformes Tempo = anfängerfreundlich). */
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

/** Melodien im C4–A4-Bereich: C/D auf der B-Saite (2), Rest auf der hohen E-Saite (1). */
const hi = (note: string): { note: string; string: number } => ({
  note,
  string: note === "C4" || note === "D4" ? 2 : 1,
});

/** Tuples [Ton, Saite] → ChartNote-Eingaben. */
const tuples = (pairs: Array<[string, number]>) =>
  pairs.map(([note, string]) => ({ note, string }));

/**
 * Taktbasierte Notenfolge: jede Note hat eine Länge in Schlägen (beats),
 * Standard 1. Onset-Zeiten und Dauer ergeben sich aus dem Tempo — so wird
 * eine „lange" Note (z.B. beats: 2) automatisch zum längeren Block und der
 * nächste Ton kommt entsprechend später.
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

// ─── Stufe 1: Einstieg — nur leere Saiten ──────────────────────────────────

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

// ─── Stufe 2: Leicht — wenige Töne, ein bis zwei Saiten ─────────────────────

// Drei Töne, alle auf der G-Saite (G3 offen, A3 2. Bund, B3 4. Bund).
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

// ─── Stufe 3: Mittel — vollständige Melodien ────────────────────────────────

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

// Erste Zeile „Ode an die Freude" (Beethoven, gemeinfrei).
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

// ─── Stufe 4: Fortgeschritten — Tonleitern über mehrere Saiten ──────────────

// Klassische C-Dur-Tonleiter in der ersten Lage, hoch und runter (Saiten 5–2).
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

// E-Moll-Pentatonik (die „Rock-Tonleiter"), offene Lage über alle sechs Saiten.
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

/**
 * Skaliert ein Chart auf ein Tempo: speed > 1 schneller (Noten näher
 * zusammen), speed < 1 langsamer (mehr Luft zwischen den Tönen).
 * Trefferfenster (in Sekunden) bleiben konstant — langsamer = mehr Ruhe.
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
  ALLE_MEINE_ENTCHEN,
  TWINKLE,
  ODE_AN_DIE_FREUDE,
  C_DUR_TONLEITER,
  EM_PENTATONIK,
];
