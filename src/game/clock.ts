/**
 * Master clock of the game = audioContext.currentTime.
 * All note positions and hit windows compute against this clock,
 * never against requestAnimationFrame — the audio clock does not drift.
 */
export type GameClock = {
  context: AudioContext;
  /** Context time at which chart time 0 reaches the hit line. */
  startAt: number;
  /** Current game time in seconds (negative during the countdown). */
  now(): number;
};

export function createGameClock(context: AudioContext, leadInSeconds = 3): GameClock {
  const startAt = context.currentTime + leadInSeconds;
  return {
    context,
    startAt,
    now: () => context.currentTime - startAt,
  };
}
