"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import { SpaceMap } from "./SpaceMap";
import type { PlanSpace } from "./roomPlan";
import type { SceneStats } from "./Scene";
import { TrustBadge } from "@/components/ui/ui";
import type { Asset } from "@/types";

const Scene = dynamic(() => import("./Scene"), { ssr: false, loading: () => <Loading /> });

function Loading() {
  return <div className="flex h-full items-center justify-center text-sm text-muted" role="status">Loading 3D viewer…</div>;
}

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function webglSupported(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

type Mode = "3d" | "plan" | "photos";

interface Props {
  spaces: (PlanSpace & { dimensions_verified?: boolean })[];
  style: string;
  photos: Asset[];
  modelTrust: "illustrative_model" | "verified_model";
  dimensionSource: "verified" | "owner" | "illustrative";
  initialMode?: Mode;
  initialSpace?: string | null;
  autoLoad?: boolean;
  compact?: boolean;
  renderMode?: boolean;
}

export function Explore({ spaces, style, photos, modelTrust, dimensionSource, initialMode = "3d", initialSpace = null, autoLoad = false, compact = false, renderMode = false }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [selected, setSelected] = useState<string | null>(initialSpace);
  const [load3d, setLoad3d] = useState(autoLoad);
  const [support, setSupport] = useState<"unknown" | "yes" | "no">("unknown");
  const [failed, setFailed] = useState(false);
  const [stats, setStats] = useState<SceneStats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [ready, setReady] = useState(false);
  const [quality, setQuality] = useState<"high" | "low">("high");

  useEffect(() => {
    const ok = webglSupported() && !new URLSearchParams(window.location.search).has("no3d");
    const small = window.matchMedia("(max-width: 640px)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    // Deferred so the first paint stays light; this only reads device capabilities.
    const id = requestAnimationFrame(() => {
      setSupport(ok ? "yes" : "no");
      if (small) setQuality("low");
      if (!ok && initialMode === "3d") setMode(spaces.length ? "plan" : "photos");
    });
    return () => cancelAnimationFrame(id);
  }, [initialMode, spaces.length]);

  const onError = useCallback(() => { setFailed(true); setMode(spaces.length ? "plan" : "photos"); }, [spaces.length]);
  const select = useCallback((id: string | null) => { setSelected(id); }, []);
  const onReady = useCallback(() => setReady(true), []);
  const can3d = support === "yes" && !failed && spaces.length > 0;

  return (
    <section aria-label="Housio Explore" className={`overflow-hidden rounded-3xl border border-line bg-white ${compact ? "" : "shadow-sm"}`} data-testid="explore">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div role="tablist" aria-label="View" className="flex gap-1 rounded-full bg-ivory p-1">
          {([["3d", "3D view"], ["plan", "Floor plan"], ["photos", "Photos"]] as [Mode, string][]).map(([m, label]) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} disabled={m === "3d" && !can3d && support !== "unknown"}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${mode === m ? "bg-forest text-white" : "text-forest hover:bg-sage/70"} disabled:opacity-40`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <TrustBadge kind={modelTrust} />
          {mode === "3d" && load3d && can3d && !compact && (
            <button className="text-xs text-muted underline" onClick={() => setShowStats((s) => !s)} aria-pressed={showStats}>Performance</button>
          )}
        </div>
      </div>

      {mode !== "photos" && spaces.length > 0 && (
        <nav aria-label="Rooms" className="flex gap-1.5 overflow-x-auto border-b border-line px-4 py-2.5">
          <button onClick={() => select(null)} aria-pressed={selected === null} className={`chip shrink-0 ${selected === null ? "!border-forest !bg-forest !text-white" : ""}`}>Overview</button>
          {spaces.map((s) => (
            <button key={s.id} onClick={() => select(s.id)} aria-pressed={selected === s.id} className={`chip shrink-0 ${selected === s.id ? "!border-forest !bg-forest !text-white" : ""}`}>{s.name}</button>
          ))}
        </nav>
      )}

      <div className={`relative ${compact ? "h-[320px]" : "h-[420px] sm:h-[520px]"} bg-ivory`}>
        {mode === "3d" && (
          support === "unknown" ? <Loading /> :
          !can3d ? (
            <Fallback reason={failed ? "The 3D viewer could not start on this device." : spaces.length ? "3D isn't available on this device." : "No 3D scene for this unit."} onPlan={() => setMode("plan")} onPhotos={() => setMode("photos")} />
          ) : !load3d ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="font-display text-xl font-semibold text-forest">Step inside</p>
              <p className="max-w-sm text-sm text-muted">Orbit, zoom and move room to room. This interior is {modelTrust === "verified_model" ? "a verified model of this unit" : "an illustrative template, not this exact property"}.</p>
              <button className="btn btn-primary" onClick={() => setLoad3d(true)}>Load 3D tour</button>
            </div>
          ) : (
            <SceneBoundary onError={onError}>
              <Scene spaces={spaces} style={style} selected={selected} onSelect={select} onStats={setStats} onReady={onReady} quality={quality} preserveBuffer={renderMode} />
              <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] text-muted" data-ready={ready ? "1" : "0"} data-testid="scene-status">
                {ready ? "Drag to orbit · scroll or pinch to zoom · tap furniture to inspect" : "Loading furniture…"}
              </p>
              {showStats && stats && (
                <dl className="absolute right-3 top-3 grid grid-cols-2 gap-x-3 rounded-xl bg-forest/90 px-3 py-2 font-mono text-[11px] text-ivory" data-testid="perf">
                  <dt>Frame</dt><dd>{stats.ms} ms</dd><dt>FPS</dt><dd>{stats.fps}</dd><dt>Draw calls</dt><dd>{stats.calls}</dd><dt>Triangles</dt><dd>{stats.triangles.toLocaleString()}</dd><dt>DPR</dt><dd>{stats.dpr}</dd>
                </dl>
              )}
            </SceneBoundary>
          )
        )}
        {mode === "plan" && (
          <div className="h-full overflow-auto p-4">
            <SpaceMap spaces={spaces} selected={selected} onSelect={(id) => { select(id); if (can3d) { setLoad3d(true); setMode("3d"); } }} dimensionSource={dimensionSource} />
          </div>
        )}
        {mode === "photos" && <Photos photos={photos} />}
      </div>
    </section>
  );
}

function Fallback({ reason, onPlan, onPhotos }: { reason: string; onPlan: () => void; onPhotos: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center" data-testid="explore-fallback">
      <p className="font-display text-lg font-semibold text-forest">{reason}</p>
      <p className="text-sm text-muted">You can still explore the layout and photos.</p>
      <div className="flex gap-2"><button className="btn btn-secondary" onClick={onPlan}>Floor plan</button><button className="btn btn-secondary" onClick={onPhotos}>Photos</button></div>
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
          <figcaption className="absolute left-2 top-2"><TrustBadge kind={p.trust_label} /></figcaption>
        </figure>
      ))}
    </div>
  );
}
