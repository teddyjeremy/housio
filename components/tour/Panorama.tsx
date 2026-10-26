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
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
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

function Sphere({ room, onStage }: { room: TourRoom; onStage: (id: string, s: "low" | "full") => void }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let live = true;
    const first = room.low ?? room.url;
    load(first).then((t) => { if (live) { setTex(t); onStage(room.id, room.low ? "low" : "full"); invalidate(); } }).catch(() => {});
    if (room.low) load(room.url).then((t) => { if (live) { setTex(t); onStage(room.id, "full"); invalidate(); } }).catch(() => {});
    return () => { live = false; };
  }, [room, onStage, invalidate]);
  if (!tex) return null;
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[50, 72, 36]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

function Rig({ view, register }: { view: React.RefObject<View>; register: (fn: (() => void) | null) => void }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { register(() => invalidate()); return () => register(null); }, [register, invalidate]);
  const cur = useRef<View>({ ...view.current! });
  const target = useRef(new THREE.Vector3());
  useFrame((state, dt) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const v = view.current!;
    const k = 1 - Math.exp(-dt * 12);
    cur.current.yaw += (v.yaw - cur.current.yaw) * k;
    cur.current.pitch += (v.pitch - cur.current.pitch) * k;
    cur.current.fov += (v.fov - cur.current.fov) * k;
    const { yaw, pitch, fov } = cur.current;
    target.current.set(-Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.sin(yaw) * Math.cos(pitch));
    camera.lookAt(target.current);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    const moving = Math.abs(v.yaw - yaw) + Math.abs(v.pitch - pitch) + Math.abs(v.fov - fov) > 0.0005;
    if (moving) state.invalidate();
  });
  return null;
}

export default function Panorama({ room, view, register, onStage, onInteract, preserveBuffer = false }: {
  room: TourRoom;
  view: React.RefObject<View>;
  register: (fn: (() => void) | null) => void;
  onStage: (id: string, s: "low" | "full") => void;
  onInteract: () => void;
  preserveBuffer?: boolean;
}) {
  return (
    <Canvas frameloop="demand" dpr={[1, 1.75]} camera={{ fov: view.current!.fov, near: 0.1, far: 200, position: [0, 0, 0] }}
      gl={{ antialias: false, preserveDrawingBuffer: preserveBuffer, powerPreference: "high-performance" }}
      onPointerDown={onInteract} data-testid="tour-canvas">
      <Sphere key={room.id} room={room} onStage={onStage} />
      <Rig view={view} register={register} />
    </Canvas>
  );
}
