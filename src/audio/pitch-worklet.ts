/**
 * AudioWorklet processor: continuous pitch detection with pitchy (MPM).
 *
 * Runs off the main thread. Collects mic samples in a ring buffer and every
 * HOP_SIZE samples runs McLeod pitch detection over the last WINDOW_SIZE
 * samples, posting a PitchReading to the main thread.
 *
 * This file is bundled separately via esbuild (pnpm build:worklet) into
 * public/worklet/pitch-processor.js — it must not import DOM/React code.
 */
import { PitchDetector } from "pitchy";

import type { PitchReading } from "./messages";

// 2048 samples @ 48 kHz ≈ 43 ms window ≈ 3.5 periods of low E (82 Hz) —
// enough for MPM while keeping latency acceptable.
const WINDOW_SIZE = 2048;
const HOP_SIZE = 512;

class PitchProcessor extends AudioWorkletProcessor {
  private ring = new Float32Array(WINDOW_SIZE);
  private writeIndex = 0;
  private samplesSinceAnalysis = 0;
  private window = new Float32Array(WINDOW_SIZE);
  private detector = PitchDetector.forFloat32Array(WINDOW_SIZE);

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this.ring[this.writeIndex] = channel[i];
      this.writeIndex = (this.writeIndex + 1) % WINDOW_SIZE;
    }
    this.samplesSinceAnalysis += channel.length;

    if (this.samplesSinceAnalysis >= HOP_SIZE) {
      this.samplesSinceAnalysis = 0;
      this.analyze();
    }
    return true;
  }

  private analyze(): void {
    // Unroll the ring buffer into chronological order.
    const tail = WINDOW_SIZE - this.writeIndex;
    this.window.set(this.ring.subarray(this.writeIndex), 0);
    this.window.set(this.ring.subarray(0, this.writeIndex), tail);

    let sumSquares = 0;
    for (let i = 0; i < WINDOW_SIZE; i++) {
      sumSquares += this.window[i] * this.window[i];
    }
    const rms = Math.sqrt(sumSquares / WINDOW_SIZE);

    const [frequency, clarity] = this.detector.findPitch(this.window, sampleRate);

    const reading: PitchReading = { frequency, clarity, rms, time: currentTime };
    this.port.postMessage(reading);
  }
}

registerProcessor("pitch-processor", PitchProcessor);
