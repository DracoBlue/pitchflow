# Pitchflow

A 3D rhythm game in the browser that you play with a **real guitar through your
microphone**. Notes fly down a lane per string toward a hit line — you have to play the
right note at the right moment. The Rocksmith idea (a real instrument as input) in the
lane-scroller look of Guitar Hero, shipped as an installable PWA.

> Repo: <https://github.com/DracoBlue/pitchflow>

The hard part isn't the visuals — it's the **real-time pitch detection** from the audio
signal. That runs here via [`pitchy`](https://github.com/ianprime0509/pitchy)
(McLeod Pitch Method) inside an AudioWorklet, off the main thread.

## Features

- 🎸 **Play with a real guitar** through the microphone — no special hardware needed.
- 🎯 **Tuner** with live pitch, cents display, and an adjustable noise gate (`/`).
- 🛣️ **Six string lanes** (low E on the left, high E on the right), notes synced to the
  audio clock; every block shows its **fret and note** (`/play`).
- 🎵 **Practice songs with difficulty levels** (beginner → advanced) — from an open-string
  drill through "Mary Had a Little Lamb" to the E minor pentatonic, all public domain.
- ⏱️ **Tempo control** (50–125 %) and a **practice loop**: a song you didn't play perfectly
  restarts automatically until you nail it.
- 📱 **Installable PWA** (manifest + service worker, no extra library).

Monophonic only (single notes), standard tuning **E A D G B E**. Chord detection is
intentionally out of scope.

### Your own / local songs

The repo only contains **public-domain** songs. Additional pieces (e.g. copyrighted ones)
can live in a local, **uncommitted** `public/songs.json` file — it's in `.gitignore` and is
loaded automatically at startup if present. Format:

```json
{
  "songs": [
    {
      "id": "my-song",
      "title": "My Song",
      "description": "...",
      "difficulty": 2,
      "secondsPerBeat": 0.7,
      "notes": [
        { "note": "G3", "string": 3 },
        { "note": "B3", "string": 2, "beats": 2 }
      ]
    }
  ]
}
```

`beats` sets the length (default 1; longer notes, e.g. `2`, become longer blocks).
Without the file you simply get the built-in songs.

## Quick start

Requirements: Node 20+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev
```

Then open <http://localhost:3000>, allow microphone access, and play a note.
Microphone access only works over **HTTPS or localhost**.

Test PWA behavior (service worker, installability) only in a production build:

```bash
pnpm build && pnpm start
```

## How it works

Three non-negotiable core principles:

1. **The master clock is `audioContext.currentTime`.** All note positions and hit windows
   are computed against the audio clock, never against `requestAnimationFrame` — that drifts
   and ruins the timing feel.
2. **Pitch detection runs in the AudioWorklet**, not on the main thread, so 60 fps stay free.
3. **Microphone without speech processing** (echo cancellation, noise suppression, and
   auto-gain are off — they would distort a guitar signal).

### AudioWorklet bundle

Pitch detection lives in [`src/audio/pitch-worklet.ts`](src/audio/pitch-worklet.ts).
Because AudioWorklets load as their own module, the file is bundled with esbuild into
`public/worklet/pitch-processor.js`. That runs automatically before `pnpm dev` and
`pnpm build`. **If you change the worklet code while the dev server is running, run
`pnpm build:worklet` manually and reload.**

### Project structure

```
src/audio/
  pitch-worklet.ts    # AudioWorklet: pitchy/MPM, ring buffer (2048-sample window, 512 hop)
  micStream.ts        # getUserMedia + AudioContext + worklet wiring
  noteMapper.ts       # Hz <-> note/octave/cents, string/fret reference
  messages.ts         # worklet <-> main-thread message type
src/game/
  clock.ts            # master clock = audioContext.currentTime
  chart.ts            # chart types + built-in songs, tempo scaling
  externalCharts.ts   # loads optional local public/songs.json
  scoring.ts          # hit windows: timing (±250 ms) x pitch (±30 cents)
  store.ts            # zustand: status, note states, score, combo
src/components/
  PitchMonitor.tsx    # tuner: note, cents bar, clarity/level meters, gate sliders
  play/PlayScene.tsx  # game logic: mic, hit detection, miss sweep, HUD, tempo, loop
  play/GameCanvas.tsx # react-three-fiber: lanes, hit line, flying notes
src/app/
  manifest.ts         # PWA manifest (native via Next.js)
public/
  sw.js               # minimal service worker (network-first, cache fallback)
```

## Tech stack

[Next.js](https://nextjs.org/) (App Router) · TypeScript · [pitchy](https://github.com/ianprime0509/pitchy) ·
Web Audio API / AudioWorklet · [react-three-fiber](https://r3f.docs.pmnd.rs/) + three.js ·
[zustand](https://zustand.docs.pmnd.rs/) · Tailwind CSS.

## Roadmap

- [x] **M0** — pitch-detection proof (tuner, validated with a real guitar)
- [x] **M1** — PWA scaffold (manifest, service worker, icons)
- [x] **M2** — string lanes, flying notes, hit/miss detection, song selection
- [ ] **M3** — graded scoring (Perfect/Good), more levels, real rhythms
- [ ] **M4** — 3D polish (hit animations, particles, tuning screen)

## License

[MIT](LICENSE) © DracoBlue
