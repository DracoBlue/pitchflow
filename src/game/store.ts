import { create } from "zustand";

import type { Chart } from "./chart";

export type NoteState = "pending" | "hit" | "missed";
export type GameStatus = "idle" | "running" | "finished";

export type Judgement = {
  noteIndex: number;
  result: "perfect" | "good" | "miss";
  /** Game time (audio clock) of the judgement, for time-limited HUD overlays. */
  atTime: number;
};

type GameStore = {
  status: GameStatus;
  chart: Chart | null;
  noteStates: NoteState[];
  score: number;
  combo: number;
  /** Highest combo reached in this run. */
  maxCombo: number;
  /** Number of Perfect and Good judgements for the results breakdown. */
  perfectCount: number;
  goodCount: number;
  lastJudgement: Judgement | null;
  start: (chart: Chart) => void;
  judge: (noteIndex: number, result: "perfect" | "good" | "miss", atTime: number) => void;
  reset: () => void;
};

/** Base points per judgement; the running combo acts as a multiplier. */
const BASE_POINTS = { perfect: 200, good: 100, miss: 0 } as const;

const CLEARED = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  perfectCount: 0,
  goodCount: 0,
  lastJudgement: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  status: "idle",
  chart: null,
  noteStates: [],
  ...CLEARED,

  start: (chart) =>
    set({
      status: "running",
      chart,
      noteStates: chart.notes.map(() => "pending"),
      ...CLEARED,
    }),

  judge: (noteIndex, result, atTime) => {
    const { noteStates, score, combo, maxCombo, perfectCount, goodCount } = get();
    if (noteStates[noteIndex] !== "pending") return;
    const next = [...noteStates];
    next[noteIndex] = result === "miss" ? "missed" : "hit";
    const finished = next.every((s) => s !== "pending");

    const nextCombo = result === "miss" ? 0 : combo + 1;
    // Combo multiplier: every 10 hits in a row +1× (×1 … ×5).
    const multiplier = result === "miss" ? 0 : Math.min(5, 1 + Math.floor(combo / 10));

    set({
      noteStates: next,
      score: score + BASE_POINTS[result] * multiplier,
      combo: nextCombo,
      maxCombo: Math.max(maxCombo, nextCombo),
      perfectCount: perfectCount + (result === "perfect" ? 1 : 0),
      goodCount: goodCount + (result === "good" ? 1 : 0),
      lastJudgement: { noteIndex, result, atTime },
      status: finished ? "finished" : "running",
    });
  },

  reset: () =>
    set({
      status: "idle",
      chart: null,
      noteStates: [],
      ...CLEARED,
    }),
}));
