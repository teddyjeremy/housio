"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Html, OrbitControls, PerformanceMonitor, useGLTF, useTexture } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { buildScene, modelInfo, modelSize, STYLES, type ModelKey, type PlanSpace, type Placement, type ScenePlan } from "./roomPlan";

export interface SceneStats { fps: number; ms: number; calls: number; triangles: number; dpr: number }

interface Props {
  spaces: PlanSpace[];
  style: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onStats?: (s: SceneStats) => void;
  onReady?: () => void;
  quality: "high" | "low";
  preserveBuffer?: boolean;
}

const WALL_T = 0.08;

function useSurface(name: "wood_floor" | "tiles" | "plaster" | "grass", repeat: number) {
  // Texture settings are applied in the loader callback, before the textures are handed back.
  return useTexture({ map: `/assets/textures/${name}_color.jpg`, normalMap: `/assets/textures/${name}_normal.jpg`, roughnessMap: `/assets/textures/${name}_rough.jpg` }, (loaded) => {
    const list = Array.isArray(loaded) ? loaded : Object.values(loaded as Record<string, THREE.Texture>);
    list.forEach((t, i) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat, repeat);
      t.anisotropy = 4;
      if (i === 0) t.colorSpace = THREE.SRGBColorSpace;
    });
  });
}

function Rooms({ plan, style, cutaway, onSelect }: { plan: ScenePlan; style: string; cutaway: boolean; onSelect: (id: string) => void }) {
  const wood = useSurface("wood_floor", 1);
  const tiles = useSurface("tiles", 1);
  const grass = useSurface("grass", 1);
  const plaster = useSurface("plaster", 1);
  const palette = STYLES[style] ?? STYLES.warm;
  const floorMats = useMemo(() => ({
    wood: new THREE.MeshStandardMaterial({ ...wood, color: palette.floorTint, roughness: 0.7 }),
    tiles: new THREE.MeshStandardMaterial({ ...tiles, color: "#f2efe8", roughness: 0.4 }),
    grass: new THREE.MeshStandardMaterial({ ...grass, roughness: 1 }),
  }), [wood, tiles, grass, palette.floorTint]);
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ ...plaster, color: palette.wall, roughness: 0.9 }), [plaster, palette.wall]);
  const unitBox = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  // One floor geometry per room with UVs in metres, so textures keep a real-world scale.
  const floors = useMemo(() => plan.rooms.map((r) => {
    const g = new THREE.PlaneGeometry(r.width, r.depth);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r.width / 1.5, uv.getY(i) * r.depth / 1.5);
    return g;
  }), [plan]);
  useEffect(() => () => { unitBox.dispose(); floors.forEach((g) => g.dispose()); }, [unitBox, floors]);
  useEffect(() => () => { wallMat.dispose(); Object.values(floorMats).forEach((m) => m.dispose()); }, [wallMat, floorMats]);

  return (
    <group>
      {plan.rooms.map((r, ri) => {
        const h = cutaway ? 1.0 : (r.height ?? 2.7);
        const outdoor = r.kind === "balcony" || r.kind === "garden";
        const wh = outdoor ? 1.05 : h;
        return (
          <group key={r.id}>
            <mesh geometry={floors[ri]} material={floorMats[r.floor]} rotation-x={-Math.PI / 2} position={[r.cx, 0, r.cz]} receiveShadow
              onClick={(e) => { e.stopPropagation(); onSelect(r.id); }} />
            {[
              [r.cx, r.z, r.width, WALL_T],
              [r.cx, r.z + r.depth, r.width, WALL_T],
              [r.x, r.cz, WALL_T, r.depth],
              [r.x + r.width, r.cz, WALL_T, r.depth],
            ].map(([x, z, sx, sz], i) => (
              <mesh key={i} geometry={unitBox} material={wallMat} position={[x, wh / 2, z]} scale={[sx, outdoor ? 0.06 + wh : wh, sz]} castShadow={!cutaway} receiveShadow />
            ))}
          </group>
        );
      })}
    </group>
  );
}

/**
 * Draws every placement of one model with InstancedMesh, so repeated items such as
 * dining chairs cost one draw call per sub-mesh regardless of how many there are.
 */
function InstancedModel({ model, items, onPick }: { model: ModelKey; items: Placement[]; onPick: (p: Placement) => void }) {
  const info = modelInfo(model);
  const { scene } = useGLTF(info.file);
  const parts = useMemo(() => {
    const root = scene.clone(true);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const out: { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; matrices: THREE.Matrix4[] }[] = [];
    const meshes: THREE.Mesh[] = [];
    root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    for (const mesh of meshes) {
      const matrices = items.map((p) => {
        const [tw, th, td] = p.size ?? modelSize(model);
        // Uniform scale so the model fits its real-world target box without distortion.
        const s = Math.min(tw / Math.max(size.x, 1e-3), th / Math.max(size.y, 1e-3), td / Math.max(size.z, 1e-3));
        const center = box.getCenter(new THREE.Vector3());
        const normalise = new THREE.Matrix4().makeScale(s, s, s).premultiply(new THREE.Matrix4().makeTranslation(0, 0, 0))
          .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));
        const place = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rotY), new THREE.Vector3(1, 1, 1));
        return place.multiply(normalise).multiply(mesh.matrixWorld);
      });
      out.push({ geometry: mesh.geometry, material: mesh.material, matrices });
    }
    return out;
  }, [scene, items, model]);
  return (
    <group>
      {parts.map((part, i) => (
        <instancedMesh
          key={i}
          args={[part.geometry, part.material, part.matrices.length]}
          castShadow
          receiveShadow
          ref={(m) => {
            if (!m) return;
            part.matrices.forEach((mx, j) => m.setMatrixAt(j, mx));
            m.instanceMatrix.needsUpdate = true;
            m.computeBoundingSphere();
          }}
          onClick={(e) => { e.stopPropagation(); if (e.instanceId != null) onPick(items[e.instanceId]); }}
        />
      ))}
    </group>
  );
}

function PickLabel({ p }: { p: Placement }) {
  const info = modelInfo(p.model);
  return (
    <Html position={[p.x, p.y + (p.size ?? modelSize(p.model))[1] + 0.25, p.z]} center distanceFactor={6} zIndexRange={[20, 0]}>
      <div className="pointer-events-none w-48 rounded-xl bg-white/95 p-2.5 text-[11px] leading-snug text-ink shadow-lg" data-testid="inspect-label">
        <p className="font-semibold text-forest">{info.name.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/ 0?\d+$/, "")}</p>
        <p className="text-muted">Illustrative item · {info.source} · {info.licence}</p>
      </div>
    </Html>
  );
}

function CameraRig({ plan, selected }: { plan: ScenePlan; selected: string | null }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, invalidate } = useThree();
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  useEffect(() => {
    const { minX, minZ, maxX, maxZ } = plan.bounds;
    const room = plan.rooms.find((r) => r.id === selected);
    if (room) {
      const target = new THREE.Vector3(room.cx, 1.0, room.cz);
      const pos = new THREE.Vector3(room.x + room.width * 0.92, Math.max(1.7, Math.max(room.width, room.depth) * 0.55), room.z + room.depth * 0.95 + 0.4);
      goal.current = { pos, target };
    } else {
      const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, span = Math.max(maxX - minX, maxZ - minZ);
      goal.current = { pos: new THREE.Vector3(cx + span * 0.35, span * 0.95 + 2, cz + span * 0.9), target: new THREE.Vector3(cx, 0, cz) };
    }
    invalidate();
  }, [plan, selected, invalidate]);
  useFrame((_, dt) => {
    const g = goal.current;
    const c = controls.current;
    if (!g || !c) return;
    const k = 1 - Math.pow(0.002, dt);
    camera.position.lerp(g.pos, k);
    c.target.lerp(g.target, k);
    c.update();
    if (camera.position.distanceTo(g.pos) < 0.02 && c.target.distanceTo(g.target) < 0.02) goal.current = null;
    else invalidate();
  });
  return <OrbitControls ref={controls} makeDefault enableDamping={false} maxPolarAngle={Math.PI / 2.05} minDistance={1.2} maxDistance={40} />;
}

function StatsProbe({ onStats, dpr }: { onStats?: (s: SceneStats) => void; dpr: number }) {
  const { gl } = useThree();
  const frames = useRef<number[]>([]);
  const last = useRef(0);
  useFrame(() => {
    const now = performance.now();
    if (last.current) frames.current.push(now - last.current);
    last.current = now;
    if (frames.current.length >= 20 && onStats) {
      const ms = frames.current.reduce((a, b) => a + b, 0) / frames.current.length;
      onStats({ fps: Math.round(1000 / ms), ms: +ms.toFixed(1), calls: gl.info.render.calls, triangles: gl.info.render.triangles, dpr });
      frames.current = [];
    }
  });
  return null;
}

function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => { onReady?.(); }, [onReady]);
  return null;
}

export default function Scene({ spaces, style, selected, onSelect, onStats, onReady, quality, preserveBuffer }: Props) {
  const plan = useMemo(() => buildScene(spaces), [spaces]);
  const [picked, setPicked] = useState<Placement | null>(null);
  const [dpr, setDpr] = useState(quality === "high" ? 1.5 : 1);
  const groups = useMemo(() => {
    const m = new Map<ModelKey, Placement[]>();
    for (const p of plan.placements) m.set(p.model, [...(m.get(p.model) ?? []), p]);
    return [...m.entries()];
  }, [plan]);
  return (
    <Canvas
      shadows={quality === "high"}
      dpr={dpr}
      frameloop="always"
      gl={{ antialias: quality === "high", powerPreference: "high-performance", preserveDrawingBuffer: !!preserveBuffer }}
      camera={{ fov: 50, near: 0.1, far: 120, position: [10, 12, 14] }}
      onPointerMissed={() => setPicked(null)}
      data-testid="explore-canvas"
    >
      <color attach="background" args={["#F6F2EA"]} />
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(quality === "high" ? 1.5 : 1)} />
      <AdaptiveDpr pixelated />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#fff8ee", "#c9bfa9", 0.6]} />
      <directionalLight position={[8, 14, 6]} intensity={1.6} castShadow={quality === "high"} shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} />
      <Suspense fallback={<Html center><span className="rounded-full bg-white px-3 py-1 text-xs text-forest shadow">Loading interior…</span></Html>}>
        <Environment files="/assets/hdri/interior_1k.hdr" environmentIntensity={0.6} />
        <Rooms plan={plan} style={style} cutaway={!selected} onSelect={onSelect} />
        {groups.map(([model, items]) => <InstancedModel key={model} model={model} items={items} onPick={setPicked} />)}
        {picked && <PickLabel p={picked} />}
        <Ready onReady={onReady} />
      </Suspense>
      <CameraRig plan={plan} selected={selected} />
      <StatsProbe onStats={onStats} dpr={dpr} />
    </Canvas>
  );
}
