/**
 * Master-Clock des Spiels = audioContext.currentTime.
 * Alle Notenpositionen und Trefferfenster rechnen gegen diese Uhr,
 * nie gegen requestAnimationFrame — die Audio-Uhr driftet nicht.
 */
export type GameClock = {
  context: AudioContext;
  /** Kontextzeit, bei der Chart-Zeit 0 die Trefferlinie erreicht. */
  startAt: number;
  /** Aktuelle Spielzeit in Sekunden (negativ während des Countdowns). */
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
