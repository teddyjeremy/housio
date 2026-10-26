"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { SpaceMap, type MapSpace } from "./SpaceMap";
import { Tour } from "@/components/tour/Tour";
import { TrustBadge } from "@/components/ui/ui";
import { roomForSpace, spaceForRoom, type TourRoom } from "@/lib/tour";
import type { Asset } from "@/types";

export function webglSupported(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

type Mode = "tour" | "plan" | "photos";

interface Props {
  rooms: TourRoom[];
  spaces: MapSpace[];
  photos: Asset[];
  dimensionSource: "verified" | "owner" | "illustrative";
  initialMode?: Mode;
  initialRoom?: number;
  compact?: boolean;
  renderMode?: boolean;
}

export function Explore({ rooms, spaces, photos, dimensionSource, initialMode = "tour", initialRoom = 0, compact = false, renderMode = false }: Props) {
  const [mode, setMode] = useState<Mode>(rooms.length ? initialMode : spaces.length ? "plan" : "photos");
  const [index, setIndex] = useState(Math.min(initialRoom, Math.max(0, rooms.length - 1)));
  const [support, setSupport] = useState<"unknown" | "yes" | "no">("unknown");

  useEffect(() => {
    const ok = webglSupported() && !new URLSearchParams(window.location.search).has("no3d");
    const id = requestAnimationFrame(() => setSupport(ok ? "yes" : "no"));
    return () => cancelAnimationFrame(id);
  }, []);

  const pickSpace = useCallback((id: string) => {
    const s = spaces.find((x) => x.id === id);
    const i = s ? roomForSpace(rooms, s) : -1;
    if (i >= 0) { setIndex(i); setMode("tour"); }
  }, [spaces, rooms]);

  const room = rooms[index];
  const tabs: [Mode, string][] = [["tour", "360° tour"], ["plan", "Floor plan"], ["photos", "Photos"]];

  return (
    <section aria-label="Room tour" className={`overflow-hidden rounded-3xl border border-line bg-white ${compact ? "" : "shadow-sm"}`} data-testid="explore">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div role="tablist" aria-label="View" className="flex gap-1 rounded-full bg-ivory p-1">
          {tabs.map(([m, label]) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              disabled={(m === "tour" && !rooms.length) || (m === "plan" && !spaces.length)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${mode === m ? "bg-forest text-white" : "text-forest hover:bg-sage/70"} disabled:opacity-40`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "tour" && rooms.length > 1 && (
        <nav aria-label="Rooms" className="flex gap-1.5 overflow-x-auto border-b border-line px-4 py-2.5">
          {rooms.map((r, i) => (
            <button key={r.id} onClick={() => setIndex(i)} aria-pressed={i === index}
              className={`chip shrink-0 ${i === index ? "!border-forest !bg-forest !text-white" : ""}`}>{r.label}</button>
          ))}
        </nav>
      )}

      <div className={`relative ${compact ? "h-[300px]" : "h-[440px] sm:h-[560px]"} bg-ivory`}>
        {mode === "tour" && room && (
          support === "no" ? <Fallback room={room} onPlan={spaces.length ? () => setMode("plan") : undefined} onPhotos={() => setMode("photos")} /> :
          support === "unknown" ? <Poster room={room} /> :
          <Tour rooms={rooms} index={index} onIndex={setIndex} compact={compact} preserveBuffer={renderMode} />
        )}
        {mode === "plan" && (
          <div className="h-full overflow-auto p-4">
            <SpaceMap spaces={spaces} selected={spaceForRoom(spaces, room)} onSelect={pickSpace} dimensionSource={dimensionSource} />
          </div>
        )}
        {mode === "photos" && <Photos photos={photos} />}
      </div>
    </section>
  );
}

function Poster({ room }: { room: TourRoom }) {
  // eslint-disable-next-line @next/next/no-img-element
  return room.low ? <img src={room.low} alt="" aria-hidden className="h-full w-full scale-[1.6] object-cover" /> : <div className="h-full w-full bg-forest" />;
}

function Fallback({ room, onPlan, onPhotos }: { room: TourRoom; onPlan?: () => void; onPhotos: () => void }) {
  return (
    <div className="relative h-full" data-testid="explore-fallback">
      <Poster room={room} />
      <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 p-4 shadow">
        <p className="text-sm text-forest"><strong>{room.label}.</strong> Interactive 360° viewing isn&apos;t available on this device.</p>
        <div className="flex gap-2">{onPlan && <button className="btn btn-secondary" onClick={onPlan}>Floor plan</button>}<button className="btn btn-secondary" onClick={onPhotos}>Photos</button></div>
      </div>
    </div>
  );
}

function Photos({ photos }: { photos: Asset[] }) {
  const list = photos.filter((p) => p.kind === "photo" || p.kind === "render");
  if (!list.length) return <p className="p-6 text-sm text-muted">No photos have been added yet.</p>;
  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-auto p-4 sm:grid-cols-2">
      {list.map((p) => (
        <figure key={p.id} className="relative overflow-hidden rounded-2xl bg-sage/40">
          <Image src={p.url} alt={p.caption || "Listing image"} width={960} height={600} className="h-full w-full object-cover" unoptimized={p.url.startsWith("/api/")} />
          {p.trust_label === "actual_photo" && p.source === "owner" && <figcaption className="absolute left-2 top-2"><TrustBadge kind="actual_photo" /></figcaption>}
        </figure>
      ))}
    </div>
  );
}
