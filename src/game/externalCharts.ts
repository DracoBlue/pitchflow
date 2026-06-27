/**
 * Loads additional songs from a local, NOT committed file
 * `public/songs.json` (in .gitignore). This keeps legally protected
 * melodies out of the public repo while still playable locally.
 *
 * If the file is not found (or is broken), only the built-in,
 * public-domain songs from chart.ts are available.
 *
 * Authoring format (beat-based, same logic as `melody()`):
 *   {
 *     "songs": [
 *       {
 *         "id": "...", "title": "...", "description": "...",
 *         "difficulty": 1..4, "secondsPerBeat": 0.7,
 *         "notes": [ { "note": "G3", "string": 3, "beats": 1 }, ... ]
 *       }
 *     ]
 *   }
 */
import { BASE_PATH } from "@/basePath";

import { melody, type Chart, type Difficulty } from "./chart";

type ExternalNote = { note: string; string?: number; beats?: number };
type ExternalSong = {
  id: string;
  title: string;
  description?: string;
  difficulty?: number;
  secondsPerBeat?: number;
  notes: ExternalNote[];
};

const DEFAULT_SECONDS_PER_BEAT = 0.7;

function toChart(song: ExternalSong): Chart | null {
  if (!song || typeof song.id !== "string" || typeof song.title !== "string") return null;
  if (!Array.isArray(song.notes) || song.notes.length === 0) return null;
  const secondsPerBeat = song.secondsPerBeat ?? DEFAULT_SECONDS_PER_BEAT;
  const difficulty = Math.min(4, Math.max(1, Math.round(song.difficulty ?? 2))) as Difficulty;
  return {
    id: song.id,
    title: song.title,
    description: song.description ?? "Lokales Lied",
    difficulty,
    bpm: Math.round(60 / secondsPerBeat),
    notes: melody(2, secondsPerBeat, song.notes),
  };
}

export async function loadExternalCharts(): Promise<Chart[]> {
  try {
    const res = await fetch(`${BASE_PATH}/songs.json`, { cache: "no-store" });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    const songs = Array.isArray(data)
      ? (data as ExternalSong[])
      : ((data as { songs?: ExternalSong[] })?.songs ?? []);
    return songs.map(toChart).filter((c): c is Chart => c !== null);
  } catch {
    return [];
  }
}
