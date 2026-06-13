"use client";

/**
 * 3D-Szene: sechs Lanes (links = Saite 6/E2 … rechts = Saite 1/E4) mit
 * Trefferlinie, Noten fliegen auf ihrer Saiten-Lane heran.
 * Positionen werden pro Frame aus der Audio-Uhr berechnet (clock.now()),
 * nie aus Frame-Zählern — rAF rendert nur, die Audio-Uhr bestimmt wo.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";

import { fretForNote, stringNumberForNote } from "@/audio/noteMapper";
import type { ChartNote } from "@/game/chart";
import type { GameClock } from "@/game/clock";
import { useGameStore } from "@/game/store";
import { noteLabelTexture } from "./noteLabelTexture";

/** Einheiten pro Sekunde Richtung Trefferlinie. */
const SPEED = 6;
/** Noten werden so viele Sekunden vor ihrer Zielzeit sichtbar. */
const LOOKAHEAD_S = 4;
const LANE_COUNT = 6;
const LANE_WIDTH = 0.85;
/** Länge eines kurzen Blocks (Note ohne Dauer) entlang der Lane. */
const DEFAULT_DEPTH = 0.5;
/** Block-Höhe (flach). */
const BLOCK_HEIGHT = 0.12;
const TOTAL_WIDTH = LANE_COUNT * LANE_WIDTH;
const LANE_LENGTH = LOOKAHEAD_S * SPEED + 4;

/** Farben pro Saite (6 = tiefes E … 1 = hohes E). */
const STRING_COLORS: Record<number, string> = {
  6: "#ef4444",
  5: "#eab308",
  4: "#3b82f6",
  3: "#f97316",
  2: "#22c55e",
  1: "#a855f7",
};

/** Saite der Note (aus Chart oder offener Saite), Fallback tiefe E-Saite. */
function stringForNote(note: ChartNote): number {
  return note.string ?? stringNumberForNote(note.note) ?? 6;
}

/** Lane 0 (links) = Saite 6 … Lane 5 (rechts) = Saite 1. */
const laneX = (stringNumber: number) =>
  (6 - stringNumber - (LANE_COUNT - 1) / 2) * LANE_WIDTH;

function NoteObject({
  note,
  index,
  clock,
}: {
  note: ChartNote;
  index: number;
  clock: GameClock;
}) {
  const groupRef = useRef<Group>(null);
  const state = useGameStore((s) => s.noteStates[index]);
  const stringNumber = stringForNote(note);
  const label = useMemo(
    () => noteLabelTexture(note.note, fretForNote(note.note, stringNumber)),
    [note.note, stringNumber]
  );

  // Block-Länge aus der Notendauer; die Vorderkante (Strike-Ende) trifft die
  // Linie zum Onset, der Schwanz steht für die Haltedauer dahinter.
  const depth = note.duration != null ? Math.max(DEFAULT_DEPTH, note.duration * SPEED * 0.8) : DEFAULT_DEPTH;
  const zOffset = (DEFAULT_DEPTH - depth) / 2;
  const labelZ = Math.max(-0.05, depth / 2 - 0.3);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const dt = note.time - clock.now(); // Sekunden bis zur Trefferlinie
    // Getroffene Noten kurz nach der Linie ausblenden, sonst rauschen sie
    // riesig an der Kamera vorbei; verfehlte sinken etwas länger sichtbar ab.
    group.visible = dt < LOOKAHEAD_S && dt > (state === "hit" ? -0.3 : -0.8);
    group.position.z = -dt * SPEED + zOffset;
    // Getroffene Noten heben ab, verfehlte sinken durch die Lane.
    group.position.y =
      state === "hit" ? 0.3 + Math.min(1.5, -dt * 2) : state === "missed" && dt < 0 ? 0.3 + dt : 0.3;
  });

  const color = state === "missed" ? "#71717a" : STRING_COLORS[stringNumber];

  return (
    <group ref={groupRef} position={[laneX(stringNumber), 0.3, -LANE_LENGTH]}>
      <mesh>
        <boxGeometry args={[0.68, BLOCK_HEIGHT, depth]} />
        <meshStandardMaterial
          color={color}
          emissive={state === "hit" ? "#34d399" : color}
          emissiveIntensity={state === "hit" ? 1.2 : 0.25}
          transparent
          opacity={state === "missed" ? 0.45 : 1}
        />
      </mesh>
      {/* Beschriftung vorn auf dem Block, leicht zur Kamera geneigt */}
      {label && (
        <mesh position={[0, BLOCK_HEIGHT / 2 + 0.02, labelZ]} rotation={[-Math.PI / 2 + 0.5, 0, 0]}>
          <planeGeometry args={[0.6, 0.32]} />
          <meshBasicMaterial map={label} transparent depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function HitLine() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[TOTAL_WIDTH + 0.3, 0.05, 0.1]} />
        <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={1.2} />
      </mesh>
      {/* Farbmarker pro Lane auf der Trefferlinie */}
      {Array.from({ length: LANE_COUNT }, (_, lane) => {
        const stringNumber = 6 - lane;
        return (
          <mesh key={lane} position={[laneX(stringNumber), 0.08, 0]}>
            <boxGeometry args={[0.5, 0.05, 0.18]} />
            <meshStandardMaterial
              color={STRING_COLORS[stringNumber]}
              emissive={STRING_COLORS[stringNumber]}
              emissiveIntensity={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Lanes() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -LANE_LENGTH / 2 + 3]}>
        <planeGeometry args={[TOTAL_WIDTH + 0.2, LANE_LENGTH + 6]} />
        <meshStandardMaterial color="#18181b" />
      </mesh>
      {/* Trennlinien zwischen den Lanes */}
      {Array.from({ length: LANE_COUNT + 1 }, (_, i) => (
        <mesh
          key={i}
          position={[(i - LANE_COUNT / 2) * LANE_WIDTH, 0.02, -LANE_LENGTH / 2 + 3]}
        >
          <boxGeometry args={[0.04, 0.04, LANE_LENGTH + 6]} />
          <meshStandardMaterial color={i === 0 || i === LANE_COUNT ? "#52525b" : "#3f3f46"} />
        </mesh>
      ))}
      <HitLine />
    </group>
  );
}

export default function GameCanvas({ clock }: { clock: GameClock }) {
  const chart = useGameStore((s) => s.chart);

  return (
    <Canvas
      camera={{ position: [0, 3.4, 6.4], fov: 58 }}
      onCreated={({ camera }) => camera.lookAt(0, 0, -10)}
    >
      <color attach="background" args={["#09090b"]} />
      <fog attach="fog" args={["#09090b", 16, LANE_LENGTH + 4]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 6, 4]} intensity={1.2} />
      <Lanes />
      {chart?.notes.map((note, index) => (
        <NoteObject key={index} note={note} index={index} clock={clock} />
      ))}
    </Canvas>
  );
}
