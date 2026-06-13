import { create } from "zustand";

import type { Chart } from "./chart";

export type NoteState = "pending" | "hit" | "missed";
export type GameStatus = "idle" | "running" | "finished";

export type Judgement = {
  noteIndex: number;
  result: "hit" | "miss";
  /** Spielzeit (Audio-Uhr) des Urteils, für zeitlich begrenzte HUD-Einblendungen. */
  atTime: number;
};

type GameStore = {
  status: GameStatus;
  chart: Chart | null;
  noteStates: NoteState[];
  score: number;
  combo: number;
  lastJudgement: Judgement | null;
  start: (chart: Chart) => void;
  judge: (noteIndex: number, result: "hit" | "miss", atTime: number) => void;
  reset: () => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  status: "idle",
  chart: null,
  noteStates: [],
  score: 0,
  combo: 0,
  lastJudgement: null,

  start: (chart) =>
    set({
      status: "running",
      chart,
      noteStates: chart.notes.map(() => "pending"),
      score: 0,
      combo: 0,
      lastJudgement: null,
    }),

  judge: (noteIndex, result, atTime) => {
    const { noteStates, score, combo } = get();
    if (noteStates[noteIndex] !== "pending") return;
    const next = [...noteStates];
    next[noteIndex] = result === "hit" ? "hit" : "missed";
    const finished = next.every((s) => s !== "pending");
    set({
      noteStates: next,
      score: result === "hit" ? score + 100 : score,
      combo: result === "hit" ? combo + 1 : 0,
      lastJudgement: { noteIndex, result, atTime },
      status: finished ? "finished" : "running",
    });
  },

  reset: () =>
    set({
      status: "idle",
      chart: null,
      noteStates: [],
      score: 0,
      combo: 0,
      lastJudgement: null,
    }),
}));
