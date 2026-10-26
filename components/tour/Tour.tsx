"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TourRoom } from "@/lib/tour";
import type { View } from "./Panorama";

const Panorama = dynamic(() => import("./Panorama"), { ssr: false });

const FOV = { min: 35, max: 95, start: 75 };
type Stage = "none" | "low" | "full";
const stageOf = (m: Record<string, "low" | "full">, id?: string): Stage => (id && m[id]) || "none";
const clampPitch = (p: number) => Math.max(-1.35, Math.min(1.35, p));

export function Tour({ rooms, index, onIndex, compact = false, preserveBuffer = false }: {
  rooms: TourRoom[];
  index: number;
  onIndex: (i: number) => void;
  compact?: boolean;
  preserveBuffer?: boolean;
}) {
  const room = rooms[index];
  const view = useRef<View>({ yaw: ((room?.yaw ?? 0) * Math.PI) / 180, pitch: -0.05, fov: FOV.start });
  const kick = useRef<(() => void) | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const register = useCallback((fn: (() => void) | null) => { kick.current = fn; }, []);
  const [loaded, setLoaded] = useState<Record<string, "low" | "full">>({});
  const [hint, setHint] = useState(true);
  const stage = stageOf(loaded, room?.id);
  const poster = stage === "none";

  // Reset the view when moving to another room.
  useEffect(() => {
    if (!room) return;
    view.current = { yaw: (room.yaw * Math.PI) / 180, pitch: -0.05, fov: FOV.start };
    kick.current?.();
    // Warm up the neighbouring rooms' previews.
    for (const n of [rooms[index + 1], rooms[index - 1]]) if (n?.low) { const img = new window.Image(); img.src = n.low; }
  }, [room, rooms, index]);

  const onStage = useCallback((id: string, s: "low" | "full") => { setLoaded((cur) => (cur[id] === "full" ? cur : { ...cur, [id]: s })); }, []);

  const nudge = useCallback((dyaw: number, dpitch: number, dfov = 0) => {
    const v = view.current;
    view.current = { yaw: v.yaw + dyaw, pitch: clampPitch(v.pitch + dpitch), fov: Math.max(FOV.min, Math.min(FOV.max, v.fov + dfov)) };
    kick.current?.();
  }, []);

  // Drag, pinch and wheel.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const down = (e: PointerEvent) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); setHint(false); };
    const move = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId);
      if (!prev) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) nudge(0, 0, (pinch - d) * 0.15);
        pinch = d;
        return;
      }
      const per = (view.current.fov * Math.PI) / 180 / el.clientHeight;
      nudge(-(e.clientX - prev.x) * per, (e.clientY - prev.y) * per);
    };
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); nudge(0, 0, Math.sign(e.deltaY) * 4); setHint(false); };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); el.removeEventListener("wheel", wheel);
    };
  }, [nudge]);

  const onKey = (e: React.KeyboardEvent) => {
    const step = 0.12;
    const map: Record<string, () => void> = {
      ArrowLeft: () => nudge(-step, 0), ArrowRight: () => nudge(step, 0), ArrowUp: () => nudge(0, step), ArrowDown: () => nudge(0, -step),
      "+": () => nudge(0, 0, -6), "=": () => nudge(0, 0, -6), "-": () => nudge(0, 0, 6),
      PageDown: () => onIndex(Math.min(rooms.length - 1, index + 1)), PageUp: () => onIndex(Math.max(0, index - 1)),
    };
    const fn = map[e.key];
    if (fn) { e.preventDefault(); fn(); setHint(false); }
  };

  if (!room) return null;
  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-forest" data-testid="tour" data-stage={stage}>
      {poster && room.low && (
        // The low-res panorama doubles as an instant poster while the viewer starts.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={room.low} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-[1.6] object-cover opacity-90" />
      )}
      <div ref={box} tabIndex={0} onKeyDown={onKey} role="application"
        aria-label={`360° view of the ${room.label}. Drag or use arrow keys to look around, plus and minus to zoom, Page Up and Page Down to change room.`}
        className="absolute inset-0 cursor-grab touch-none outline-none focus-visible:ring-4 focus-visible:ring-champagne/70 active:cursor-grabbing">
        <Panorama room={room} view={view} register={register} onStage={onStage} onInteract={() => setHint(false)} preserveBuffer={preserveBuffer} />
      </div>

      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-forest/80 px-3 py-1 text-xs font-semibold text-ivory backdrop-blur">
        {room.label} <span className="font-normal text-ivory/70">· {index + 1} of {rooms.length}</span>
      </div>
      <div className="absolute right-3 top-3 flex gap-1.5">
        <button type="button" aria-label="Zoom in" onClick={() => nudge(0, 0, -8)} className="h-9 w-9 rounded-full bg-white/90 text-lg font-semibold text-forest shadow">+</button>
        <button type="button" aria-label="Zoom out" onClick={() => nudge(0, 0, 8)} className="h-9 w-9 rounded-full bg-white/90 text-lg font-semibold text-forest shadow">−</button>
      </div>
      {rooms.length > 1 && (
        <>
          <button type="button" aria-label="Previous room" disabled={index === 0} onClick={() => onIndex(index - 1)}
            className="absolute left-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-white/90 text-xl text-forest shadow disabled:opacity-0">‹</button>
          <button type="button" aria-label="Next room" disabled={index === rooms.length - 1} onClick={() => onIndex(index + 1)}
            className="absolute right-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-white/90 text-xl text-forest shadow disabled:opacity-0">›</button>
        </>
      )}
      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-forest/80 px-3 py-1 text-[11px] text-ivory"
        data-testid="scene-status" data-ready={stage === "none" ? "0" : "1"}>
        {stage === "none" ? "Loading view…" : hint && !compact ? "Drag to look around · scroll or pinch to zoom" : stage === "low" ? "Sharpening…" : "360° view"}
      </p>
    </div>
  );
}
