import { create } from "zustand";

import type { Chart } from "./chart";

export type NoteState = "pending" | "hit" | "missed";
export type GameStatus = "idle" | "running" | "finished";

import { create } from "zustand";

import type { Chart } from "./chart";

export type NoteState = "pending" | "hit" | "missed";
export type GameStatus = "idle" | "running" | "finished";

export type Judgement = {
  noteIndex: number;
  result: "perfect" | "good" | "miss";
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
  judge: (noteIndex: number, result: "perfect" | "good" | "miss", atTime: number) => void;
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
    next[noteIndex] = result === "miss" ? "missed" : "hit";
    const finished = next.every((s) => s !== "pending");
    
    let points = 0;
    let comboBonus = 0;
    
    if (result === "perfect") {
      points = 200;
      comboBonus = 1;
    } else if (result === "good") {
      points = 100;
      comboBonus = 1;
    } else {
      points = 0;
      comboBonus = 0;
    }

    set({
      noteStates: next,
      score: score + points,
      combo: result === "miss" ? 0 : combo + comboBonus,
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
