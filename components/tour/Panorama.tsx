"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { TourRoom } from "@/lib/tour";

const cache = new Map<string, Promise<THREE.Texture>>();
function load(url: string): Promise<THREE.Texture> {
  let p = cache.get(url);
  if (!p) {
    p = new THREE.TextureLoader().loadAsync(url).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      return t;
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}
/** Warms the browser cache for a room without decoding it on the GPU. */
export function prefetchRoom(room: TourRoom | undefined) {
  if (room?.low) void load(room.low);
}

export interface View { yaw: number; pitch: number; fov: number }

function Sphere({ room, onStage }: { room: TourRoom; onStage: (s: "low" | "full") => void }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let live = true;
    const first = room.low ?? room.url;
    load(first).then((t) => { if (live) { setTex(t); onStage(room.low ? "low" : "full"); invalidate(); } }).catch(() => {});
    if (room.low) load(room.url).then((t) => { if (live) { setTex(t); onStage("full"); invalidate(); } }).catch(() => {});
    return () => { live = false; };
  }, [room, onStage, invalidate]);
  if (!tex) return null;
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[50, 72, 36]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

function Rig({ view, kick }: { view: React.RefObject<View>; kick: React.RefObject<(() => void) | null> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { kick.current = () => invalidate(); return () => { kick.current = null; }; }, [kick, invalidate]);
  const cur = useRef<View>({ ...view.current! });
  const target = new THREE.Vector3();
  useFrame((state, dt) => {
    const v = view.current!;
    const k = 1 - Math.exp(-dt * 12);
    cur.current.yaw += (v.yaw - cur.current.yaw) * k;
    cur.current.pitch += (v.pitch - cur.current.pitch) * k;
    cur.current.fov += (v.fov - cur.current.fov) * k;
    const { yaw, pitch, fov } = cur.current;
    target.set(-Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.sin(yaw) * Math.cos(pitch));
    camera.lookAt(target);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    const moving = Math.abs(v.yaw - yaw) + Math.abs(v.pitch - pitch) + Math.abs(v.fov - fov) > 0.0005;
    if (moving) state.invalidate();
  });
  return null;
}

export default function Panorama({ room, view, kick, onStage, onInteract, preserveBuffer = false }: {
  room: TourRoom;
  view: React.RefObject<View>;
  kick: React.RefObject<(() => void) | null>;
  onStage: (s: "low" | "full") => void;
  onInteract: () => void;
  preserveBuffer?: boolean;
}) {
  return (
    <Canvas frameloop="demand" dpr={[1, 1.75]} camera={{ fov: view.current!.fov, near: 0.1, far: 200, position: [0, 0, 0] }}
      gl={{ antialias: false, preserveDrawingBuffer: preserveBuffer, powerPreference: "high-performance" }}
      onPointerDown={onInteract} data-testid="tour-canvas">
      <Sphere room={room} onStage={onStage} />
      <Rig view={view} kick={kick} />
    </Canvas>
  );
}
