"use client";

/**
 * 3D scene: six lanes (left = string 6/E2 … right = string 1/E4) with a
 * hit line; notes fly in along their string's lane.
 * Positions are computed per frame from the audio clock (clock.now()),
 * never from frame counters — rAF only renders, the audio clock decides where.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Group, Mesh } from "three";

import { fretForNote, stringNumberForNote } from "@/audio/noteMapper";
import type { ChartNote } from "@/game/chart";
import type { GameClock } from "@/game/clock";
import { useGameStore } from "@/game/store";
import { noteLabelTexture } from "./noteLabelTexture";

/** Units per second toward the hit line. */
const SPEED = 6;
/** Notes become visible this many seconds before their target time. */
const LOOKAHEAD_S = 4;
const LANE_COUNT = 6;
const LANE_WIDTH = 0.85;
/** Length of a short block (note without duration) along the lane. */
const DEFAULT_DEPTH = 0.5;
/** Block height (flat). */
const BLOCK_HEIGHT = 0.12;
const TOTAL_WIDTH = LANE_COUNT * LANE_WIDTH;
const LANE_LENGTH = LOOKAHEAD_S * SPEED + 4;

/** Colors per string (6 = low E … 1 = high E). */
const STRING_COLORS: Record<number, string> = {
  6: "#ef4444",
  5: "#eab308",
  4: "#3b82f6",
  3: "#f97316",
  2: "#22c55e",
  1: "#a855f7",
};

/** The note's string (from chart or open string), fallback low E string. */
function stringForNote(note: ChartNote): number {
  return note.string ?? stringNumberForNote(note.note) ?? 6;
}

/** Lane 0 (left) = string 6 … Lane 5 (right) = string 1. */
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

  // Block length from the note duration; the front edge (strike end) meets the
  // line at onset, the tail represents the hold duration behind it.
  const depth = note.duration != null ? Math.max(DEFAULT_DEPTH, note.duration * SPEED * 0.8) : DEFAULT_DEPTH;
  const zOffset = (DEFAULT_DEPTH - depth) / 2;
  const labelZ = Math.max(-0.05, depth / 2 - 0.3);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const dt = note.time - clock.now(); // seconds until the hit line
    // Hide hit notes shortly after the line, otherwise they whoosh past the
    // camera huge; missed ones sink away visible a bit longer.
    group.visible = dt < LOOKAHEAD_S && dt > (state === "hit" ? -0.3 : -0.8);
    group.position.z = -dt * SPEED + zOffset;
    // Hit notes lift off, missed ones sink through the lane.
    group.position.y =
      state === "hit" ? 0.3 + Math.min(1.5, -dt * 2) : state === "missed" && dt < 0 ? 0.3 + dt : 0.3;
    // Hit pop: briefly swell at the moment of the hit, then fade out.
    const pop = state === "hit" ? Math.max(0, 0.6 + dt * 2) : 0;
    group.scale.setScalar(1 + pop);
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
      {/* Label stands upright above the block, slightly tilted toward the camera */}
      {label && (
        <mesh position={[0, BLOCK_HEIGHT / 2 + 0.2, labelZ]} rotation={[-0.4, 0, 0]}>
          <planeGeometry args={[0.6, 0.32]} />
          <meshBasicMaterial map={label} transparent depthWrite={false} side={2} />
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
      {/* Color marker per lane on the hit line */}
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
      {/* Divider lines between the lanes */}
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

// ─── Particle effect on hit ────────────────────────────────────────────────

const BURST_LIFE_S = 0.6;

type Burst = { id: number; x: number; color: string; strong: boolean };

function HitBurst({ x, color, strong, onDone }: Burst & { onDone: () => void }) {
  const groupRef = useRef<Group>(null);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  // Fixed scatter directions per particle (perfect throws more & farther).
  const seeds = useMemo(() => {
    const count = strong ? 18 : 11;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + i * 1.3;
      const spread = 1.4 + ((i * 37) % 100) / 100 * (strong ? 2.4 : 1.6);
      return {
        vx: Math.cos(angle) * spread,
        vy: 2 + ((i * 53) % 100) / 100 * (strong ? 3.5 : 2.2),
        vz: Math.sin(angle) * spread * 0.6,
        size: 0.035 + ((i * 29) % 100) / 100 * 0.05,
      };
    });
  }, [strong]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startRef.current;
    const progress = t / BURST_LIFE_S;
    if (progress >= 1) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
      return;
    }
    group.children.forEach((child, i) => {
      const s = seeds[i];
      // Ballistic trajectory: up and apart, then pulled down by gravity.
      child.position.set(s.vx * t, s.vy * t - 6 * t * t, s.vz * t);
      const mat = (child as Mesh).material;
      if (!Array.isArray(mat)) mat.opacity = 1 - progress;
    });
  });

  return (
    <group ref={groupRef} position={[x, 0.3, 0]}>
      {seeds.map((s, i) => (
        <mesh key={i}>
          <sphereGeometry args={[s.size, 6, 6]} />
          <meshBasicMaterial color={color} transparent />
        </mesh>
      ))}
    </group>
  );
}

/** Listens for new hit judgements and spawns a particle burst for each. */
function HitBursts() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    return useGameStore.subscribe((s, prev) => {
      const j = s.lastJudgement;
      if (!j || j === prev.lastJudgement || j.result === "miss") return;
      const note = s.chart?.notes[j.noteIndex];
      if (!note) return;
      const stringNumber = stringForNote(note);
      const id = idRef.current++;
      setBursts((list) => [
        ...list,
        { id, x: laneX(stringNumber), color: STRING_COLORS[stringNumber], strong: j.result === "perfect" },
      ]);
    });
  }, []);

  const remove = useCallback(
    (id: number) => setBursts((list) => list.filter((b) => b.id !== id)),
    []
  );

  return (
    <>
      {bursts.map((b) => (
        <HitBurst key={b.id} {...b} onDone={() => remove(b.id)} />
      ))}
    </>
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
      <HitBursts />
    </Canvas>
  );
}
