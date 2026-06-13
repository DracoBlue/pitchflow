/**
 * Globals of the AudioWorkletGlobalScope (processor side).
 * lib.dom only covers the main-thread side (AudioWorkletNode), so the
 * processor environment is declared here for src/audio/pitch-worklet.ts.
 */
declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: unknown);
  abstract process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new (options?: unknown) => AudioWorkletProcessor
): void;

/** Sample rate of the AudioContext the worklet runs in. */
declare const sampleRate: number;
/** Current audio time in seconds (same clock as audioContext.currentTime). */
declare const currentTime: number;
