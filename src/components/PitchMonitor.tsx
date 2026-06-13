"use client";

/**
 * M0 — live pitch detection proof.
 * Shows detected note, frequency, clarity and level straight from the
 * AudioWorklet, with adjustable noise-gate thresholds for real-guitar testing.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { startMicPitchStream, type MicPitchStream } from "@/audio/micStream";
import type { PitchReading } from "@/audio/messages";
import { frequencyToNote, GUITAR_STRINGS, type NoteInfo } from "@/audio/noteMapper";

type DisplayState = {
  note: NoteInfo | null;
  frequency: number;
  clarity: number;
  rms: number;
  gated: boolean;
};

const IDLE: DisplayState = { note: null, frequency: 0, clarity: 0, rms: 0, gated: true };
/** Keep the last accepted note on screen briefly so the display doesn't flicker. */
const HOLD_MS = 350;

export default function PitchMonitor() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [display, setDisplay] = useState<DisplayState>(IDLE);
  const [minClarity, setMinClarity] = useState(0.9);
  const [minRms, setMinRms] = useState(0.01);

  const streamRef = useRef<MicPitchStream | null>(null);
  const latestRef = useRef<PitchReading | null>(null);
  const lastAcceptedRef = useRef<{ state: DisplayState; at: number } | null>(null);
  const gateRef = useRef({ minClarity, minRms });
  useEffect(() => {
    gateRef.current = { minClarity, minRms };
  }, [minClarity, minRms]);

  // Worklet messages arrive ~90×/s — buffer them in a ref and render at rAF rate.
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const tick = () => {
      const reading = latestRef.current;
      if (reading) {
        const { minClarity, minRms } = gateRef.current;
        const note = frequencyToNote(reading.frequency);
        const accepted = note !== null && reading.clarity >= minClarity && reading.rms >= minRms;
        if (accepted) {
          const state: DisplayState = {
            note,
            frequency: reading.frequency,
            clarity: reading.clarity,
            rms: reading.rms,
            gated: false,
          };
          lastAcceptedRef.current = { state, at: performance.now() };
          setDisplay(state);
        } else {
          const held = lastAcceptedRef.current;
          const stillHolding = held && performance.now() - held.at < HOLD_MS;
          setDisplay({
            note: stillHolding ? held.state.note : null,
            frequency: stillHolding ? held.state.frequency : 0,
            clarity: reading.clarity,
            rms: reading.rms,
            gated: true,
          });
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const stop = useCallback(async () => {
    setRunning(false);
    setDisplay(IDLE);
    latestRef.current = null;
    lastAcceptedRef.current = null;
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) await stream.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await startMicPitchStream((reading) => {
        latestRef.current = reading;
      });
      streamRef.current = stream;
      setLatencyMs(stream.estimatedLatencyMs);
      setRunning(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.stop();
    };
  }, []);

  const { note, frequency, clarity, rms, gated } = display;
  const cents = note?.cents ?? 0;
  const inTune = note !== null && Math.abs(cents) <= 30;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          Pitchflow <span className="text-zinc-500">· Tuner</span>
        </h1>
        <a
          href="/play"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Spielen →
        </a>
        <button
          onClick={running ? stop : start}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            running
              ? "bg-red-600 text-white hover:bg-red-500"
              : "bg-emerald-600 text-white hover:bg-emerald-500"
          }`}
        >
          {running ? "Stop" : "Mikrofon starten"}
        </button>
      </header>

      {error && (
        <p className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          Mikrofon-Fehler: {error}
        </p>
      )}

      {/* Note display */}
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 py-10">
        <div
          className={`text-7xl font-bold tabular-nums transition-colors ${
            note === null ? "text-zinc-700" : inTune ? "text-emerald-400" : "text-amber-400"
          }`}
        >
          {note?.label ?? "–"}
        </div>
        <div className="h-5 text-sm text-zinc-400 tabular-nums">
          {note !== null && frequency > 0
            ? `${frequency.toFixed(1)} Hz · ${cents >= 0 ? "+" : ""}${cents.toFixed(0)} Cent`
            : running
              ? "Spiel einen Ton …"
              : "Gestoppt"}
        </div>

        {/* Cents bar: ±50 cents, ±30 target window */}
        <div className="relative mt-4 h-3 w-72 overflow-hidden rounded-full bg-zinc-800">
          <div className="absolute inset-y-0 left-[20%] w-[60%] bg-zinc-700/60" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-500" />
          {note !== null && (
            <div
              className={`absolute top-0 h-full w-1.5 -translate-x-1/2 rounded-full ${
                inTune ? "bg-emerald-400" : "bg-amber-400"
              }`}
              style={{ left: `${50 + Math.max(-50, Math.min(50, cents))}%` }}
            />
          )}
        </div>
      </div>

      {/* Live meters */}
      <div className="grid grid-cols-2 gap-4">
        <Meter label="Clarity" value={clarity} threshold={minClarity} format={(v) => v.toFixed(2)} />
        <Meter
          label="Pegel (RMS)"
          value={Math.min(1, rms * 10)}
          threshold={Math.min(1, minRms * 10)}
          format={() => rms.toFixed(4)}
        />
      </div>
      {gated && running && (
        <p className="-mt-2 text-xs text-zinc-500">
          Signal unter Gate-Schwelle (Clarity ≥ {minClarity.toFixed(2)}, RMS ≥ {minRms.toFixed(3)}).
        </p>
      )}

      {/* Gate controls */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Clarity-Schwelle: {minClarity.toFixed(2)}
          <input
            type="range"
            min={0.5}
            max={0.99}
            step={0.01}
            value={minClarity}
            onChange={(e) => setMinClarity(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Noise-Gate (RMS): {minRms.toFixed(3)}
          <input
            type="range"
            min={0.001}
            max={0.1}
            step={0.001}
            value={minRms}
            onChange={(e) => setMinRms(Number(e.target.value))}
          />
        </label>
      </div>

      {/* String reference */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Standard-Stimmung
        </h2>
        <div className="grid grid-cols-6 gap-2">
          {GUITAR_STRINGS.map((s) => {
            const active = note?.label === s.label && !gated;
            return (
              <div
                key={s.string}
                className={`flex flex-col items-center rounded-lg border py-2 text-sm transition-colors ${
                  active
                    ? "border-emerald-500 bg-emerald-950 text-emerald-300"
                    : "border-zinc-800 text-zinc-400"
                }`}
              >
                <span className="font-semibold">{s.label}</span>
                <span className="text-[10px] text-zinc-500">{s.frequency.toFixed(1)} Hz</span>
              </div>
            );
          })}
        </div>
      </div>

      {latencyMs !== null && running && (
        <p className="text-xs text-zinc-500">
          Geschätzte Analyse-Latenz: ~{latencyMs.toFixed(0)} ms (Capture + 2048-Sample-Fenster).
          Tatsächliche End-to-End-Latenz mit echter Gitarre messen und notieren.
        </p>
      )}
    </div>
  );
}

function Meter({
  label,
  value,
  threshold,
  format,
}: {
  label: string;
  value: number;
  threshold: number;
  format: (value: number) => string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const passed = value >= threshold;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="tabular-nums">{format(value)}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-[width] duration-75 ${
            passed ? "bg-emerald-500" : "bg-zinc-600"
          }`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-0 h-full w-px bg-zinc-400"
          style={{ left: `${Math.max(0, Math.min(1, threshold)) * 100}%` }}
        />
      </div>
    </div>
  );
}
