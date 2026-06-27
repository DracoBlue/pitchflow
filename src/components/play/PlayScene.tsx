"use client";

/**
 * M2 play scene: mic + audio clock + hit logic + HUD.
 *
 * Hit: the first pending note whose timing window contains the
 * (latency-corrected) reading time and whose pitch matches. Miss: a note runs
 * out of the window without being hit — wrong notes never trigger a miss.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PitchReading } from "@/audio/messages";
import { startMicPitchStream, type MicPitchStream } from "@/audio/micStream";
import { fretForNote, frequencyToNote, stringNumberForNote } from "@/audio/noteMapper";
import {
  CHARTS,
  DIFFICULTY_LABELS,
  scaleChartSpeed,
  type Chart,
  type Difficulty,
} from "@/game/chart";
import { loadExternalCharts } from "@/game/externalCharts";
import { createGameClock, type GameClock } from "@/game/clock";
import {
  INPUT_LATENCY_S,
  TIMING_WINDOW_S,
  evaluateHit,
  isReadingUsable,
} from "@/game/scoring";
import { useGameStore } from "@/game/store";

// Three.js/WebGL runs purely in the browser. Without ssr:false the <Canvas>
// tries to attach events to the (not-yet-existing) DOM during static prerender
// → „Cannot read properties of null (reading 'addEventListener')".
const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

const JUDGEMENT_FLASH_S = 0.7;
/** Pause before automatically restarting the same song (if not perfect). */
const REPLAY_DELAY_S = 15;
/** URL hash prefix for deep links to a song: #/song/<id>. */
const SONG_HASH = "#/song/";

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  1: "bg-emerald-500",
  2: "bg-lime-500",
  3: "bg-amber-500",
  4: "bg-red-500",
};

/** Difficulty as filled/empty dots (1–4) plus label. */
function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className="flex shrink-0 items-center gap-2 text-xs text-zinc-400">
      <span className="flex gap-1">
        {([1, 2, 3, 4] as const).map((level) => (
          <span
            key={level}
            className={`h-1.5 w-1.5 rounded-full ${
              level <= difficulty ? DIFFICULTY_COLORS[difficulty] : "bg-zinc-700"
            }`}
          />
        ))}
      </span>
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}

/** Tempo control 50–125 %. */
function TempoControl({ speed, onChange }: { speed: number; onChange: (value: number) => void }) {
  return (
    <label className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5">
      <span className="text-sm text-zinc-400">Tempo</span>
      <input
        type="range"
        min={0.5}
        max={1.25}
        step={0.05}
        value={speed}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-emerald-500"
      />
      <span className="w-11 text-right text-sm tabular-nums text-zinc-200">
        {Math.round(speed * 100)}%
      </span>
    </label>
  );
}

/**
 * "E2" → "E2 · Saite 6, leer" or "D4" → "D4 · Saite 2, Bund 3".
 * String given explicitly (chart) or derived from the open string.
 */
function formatNote(label: string, stringNumber?: number): string {
  const resolved = stringNumber ?? stringNumberForNote(label);
  if (resolved == null) return label;
  const fret = fretForNote(label, resolved);
  const fretText = fret === 0 ? "leer" : fret !== null ? `Bund ${fret}` : null;
  return fretText ? `${label} · Saite ${resolved}, ${fretText}` : `${label} · Saite ${resolved}`;
}

export default function PlayScene() {
  const { status, chart, noteStates, score, combo, maxCombo, perfectCount, goodCount, lastJudgement } =
    useGameStore();
  const start = useGameStore((s) => s.start);
  const judge = useGameStore((s) => s.judge);
  const reset = useGameStore((s) => s.reset);

  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState<GameClock | null>(null);
  const [gameTime, setGameTime] = useState(0);
  const [liveNote, setLiveNote] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [replayIn, setReplayIn] = useState<number | null>(null);
  // Built-in (public-domain) songs + optionally local ones from public/songs.json.
  const [charts, setCharts] = useState<Chart[]>(CHARTS);
  useEffect(() => {
    let active = true;
    loadExternalCharts().then((extra) => {
      if (active && extra.length > 0) {
        setCharts([...CHARTS, ...extra].sort((a, b) => a.difficulty - b.difficulty));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const streamRef = useRef<MicPitchStream | null>(null);
  const latestReadingRef = useRef<PitchReading | null>(null);
  const clockRef = useRef<GameClock | null>(null);
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const stopMic = useCallback(async () => {
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) await stream.stop();
  }, []);

  // Hit detection per pitch reading, against the audio clock.
  const handleReading = useCallback((reading: PitchReading) => {
    const gameClock = clockRef.current;
    const state = useGameStore.getState();
    if (!gameClock || state.status !== "running" || !state.chart) return;
    if (!isReadingUsable(reading)) return;
    const t = reading.time - gameClock.startAt - INPUT_LATENCY_S;
    for (let i = 0; i < state.chart.notes.length; i++) {
      if (state.noteStates[i] !== "pending") continue;
      const note = state.chart.notes[i];
      if (Math.abs(t - note.time) > TIMING_WINDOW_S) continue;
      const result = evaluateHit(note, t, reading.frequency);
      if (result !== "miss") {
        state.judge(i, result, gameClock.now());
        return;
      }
    }
  }, []);

  const lastChartRef = useRef<Chart | null>(null);
  const startGame = useCallback(
    async (selectedChart: Chart) => {
      setError(null);
      setReplayIn(null);
      try {
        // Keep the mic open across multiple attempts — smoother practice loop.
        let stream = streamRef.current;
        if (!stream) {
          stream = await startMicPitchStream((reading) => {
            latestReadingRef.current = reading;
            handleReading(reading);
          });
          streamRef.current = stream;
        }
        const gameClock = createGameClock(stream.context, 3);
        clockRef.current = gameClock;
        setClock(gameClock);
        lastChartRef.current = selectedChart;
        // Mirror the selection in the URL so a reload loads the same song.
        window.location.hash = SONG_HASH + encodeURIComponent(selectedChart.id);
        start(scaleChartSpeed(selectedChart, speedRef.current));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [start, handleReading]
  );

  const backToMenu = useCallback(() => {
    setReplayIn(null);
    setClock(null);
    clockRef.current = null;
    reset();
    stopMic();
    // Reset the hash (without a new history entry), back to song selection.
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [reset, stopMic]);

  // Deep link: when loaded with #/song/<id>, start that song directly. Runs
  // again on every charts update until the (possibly externally loaded) song is there.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current || status !== "idle") return;
    const hash = window.location.hash;
    if (!hash.startsWith(SONG_HASH)) return;
    const id = decodeURIComponent(hash.slice(SONG_HASH.length));
    const chart = charts.find((c) => c.id === id);
    if (!chart) return;
    autoStartedRef.current = true;
    const t = setTimeout(() => startGame(chart), 0);
    return () => clearTimeout(t);
  }, [charts, status, startGame]);

  // Miss sweep + HUD tick: runs via rAF, but only reads the audio clock.
  useEffect(() => {
    if (status !== "running" || !clock || !chart) return;
    let frame = 0;
    const tick = () => {
      const now = clock.now();
      setGameTime(now);
      const states = useGameStore.getState().noteStates;
      chart.notes.forEach((note, i) => {
        if (states[i] === "pending" && now - INPUT_LATENCY_S > note.time + TIMING_WINDOW_S) {
          judge(i, "miss", now);
        }
      });
      const reading = latestReadingRef.current;
      setLiveNote(
        reading && isReadingUsable(reading)
          ? (frequencyToNote(reading.frequency)?.label ?? null)
          : null
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status, clock, chart, judge]);

  // Practice loop: after a non-perfect run, automatically restart the same song
  // after REPLAY_DELAY_S — the mic stays open for it.
  useEffect(() => {
    if (status !== "finished") return;
    const states = useGameStore.getState().noteStates;
    const perfect = states.length > 0 && states.every((s) => s === "hit");
    const chartToReplay = lastChartRef.current;
    if (perfect || !chartToReplay) return;

    let remaining = REPLAY_DELAY_S;
    const show = setTimeout(() => setReplayIn(remaining), 0);
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        startGame(chartToReplay);
      } else {
        setReplayIn(remaining);
      }
    }, 1000);
    return () => {
      clearTimeout(show);
      clearInterval(interval);
    };
  }, [status, startGame]);

  // Stop the mic when leaving the page.
  useEffect(() => {
    return () => {
      stopMic();
      reset();
    };
  }, [stopMic, reset]);

  // Judgement overlay: visibility derived directly from the play time,
  // gameTime ticks per frame anyway.
  const flashVisible =
    lastJudgement !== null && gameTime - lastJudgement.atTime < JUDGEMENT_FLASH_S;

  const nextIndex = noteStates.findIndex((s) => s === "pending");
  const nextNote = nextIndex >= 0 ? chart?.notes[nextIndex] : null;
  const hits = noteStates.filter((s) => s === "hit").length;
  const allHit = noteStates.length > 0 && hits === noteStates.length;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {clock && status !== "idle" && <GameCanvas clock={clock} />}

      {/* HUD */}
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <div className="flex items-start justify-between p-4">
          <Link href="/" className="pointer-events-auto text-sm text-zinc-400 hover:text-zinc-200">
            ← Tuner
          </Link>
          {status !== "idle" && (
            <div className="text-right tabular-nums">
              <div className="text-2xl font-bold">{score}</div>
              <div className="text-sm text-zinc-400">Combo ×{combo}</div>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
          {status === "idle" && (
            <div className="pointer-events-auto flex max-h-full min-h-0 w-full max-w-md flex-col items-center gap-4 px-4 py-4 sm:max-w-2xl">
              <h1 className="text-3xl font-bold">Was willst du üben?</h1>
              <p className="text-center text-sm text-zinc-400">
                Jede Saite hat ihre eigene Lane — links die tiefe E-Saite (6), rechts die
                hohe (1). Auf jedem Block stehen Bund und Ton.
              </p>
              <TempoControl speed={speed} onChange={setSpeed} />
              <div className="grid w-full min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
                {charts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => startGame(c)}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-left transition-colors hover:border-emerald-600 hover:bg-zinc-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{c.title}</span>
                      <DifficultyBadge difficulty={c.difficulty} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">{c.description}</p>
                  </button>
                ))}
              </div>
              {error && <p className="text-sm text-red-400">Mikrofon-Fehler: {error}</p>}
            </div>
          )}

          {status === "running" && gameTime < 0 && (
            <div className="text-7xl font-bold tabular-nums">{Math.ceil(-gameTime)}</div>
          )}

          {status === "running" && flashVisible && lastJudgement && chart && (
            <div className="flex flex-col items-center gap-1">
              <div
                className={`text-4xl font-bold ${
                  lastJudgement.result === "perfect"
                    ? "text-emerald-400"
                    : lastJudgement.result === "good"
                      ? "text-lime-400"
                      : "text-red-400"
                }`}
              >
                {lastJudgement.result === "perfect"
                  ? "Perfekt!"
                  : lastJudgement.result === "good"
                    ? "Gut!"
                    : "Daneben"}
              </div>
              <div className="text-lg text-zinc-300">
                {formatNote(
                  chart.notes[lastJudgement.noteIndex].note,
                  chart.notes[lastJudgement.noteIndex].string
                )}
              </div>
            </div>
          )}

          {status === "finished" && (
            <div className="pointer-events-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8">
              <h2 className="text-2xl font-bold">
                {chart?.title}: {allHit ? "perfekt! 🎸" : "geschafft"}
              </h2>
              <p className="text-3xl font-bold tabular-nums text-emerald-400">{score}</p>
              <div className="flex w-full justify-center gap-4 text-center text-sm tabular-nums">
                <div>
                  <div className="text-lg font-semibold text-emerald-400">{perfectCount}</div>
                  <div className="text-zinc-400">Perfekt</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-lime-400">{goodCount}</div>
                  <div className="text-zinc-400">Gut</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-400">
                    {noteStates.length - hits}
                  </div>
                  <div className="text-zinc-400">Daneben</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-zinc-100">×{maxCombo}</div>
                  <div className="text-zinc-400">Max-Combo</div>
                </div>
              </div>
              <p className="text-sm text-zinc-400 tabular-nums">
                {hits} / {noteStates.length} Treffer
              </p>
              {replayIn !== null && (
                <p className="text-sm text-zinc-400">
                  Übung macht den Meister — neuer Versuch in {replayIn} s.
                </p>
              )}
              {!allHit && <TempoControl speed={speed} onChange={setSpeed} />}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const last = lastChartRef.current;
                    if (last) startGame(last);
                  }}
                  className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500"
                >
                  {replayIn !== null ? "Sofort nochmal" : "Nochmal"}
                </button>
                <button
                  onClick={backToMenu}
                  className="rounded-lg border border-zinc-700 px-6 py-3 font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Anderes Lied
                </button>
              </div>
            </div>
          )}
        </div>

        {status === "running" && (
          <div className="flex items-end justify-between p-4 text-sm text-zinc-400">
            <div>
              Nächste Note:{" "}
              <span className="text-lg font-semibold text-zinc-100">
                {nextNote ? formatNote(nextNote.note, nextNote.string) : "–"}
              </span>
            </div>
            <div className="tabular-nums">
              Erkannt:{" "}
              <span className="text-zinc-100">{liveNote ? formatNote(liveNote) : "–"}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
