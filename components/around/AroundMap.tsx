"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { CATEGORY_COLORS, CATEGORY_LABELS, formatDistance } from "@/lib/geo";
import type { NearbyPlace } from "@/types";

// OpenFreeMap: free vector tiles built from OpenStreetMap, with no usage limits or API key,
// and terms that permit this use. Swap with NEXT_PUBLIC_MAP_STYLE_URL if needed.
const STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron";

interface Props { lat: number; lon: number; name: string; anchorExact: boolean; places: NearbyPlace[]; compact?: boolean }

export function AroundMap({ lat, lon, name, anchorExact, places, compact = false }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const cats = useMemo(() => [...new Set(places.map((p) => p.category))], [places]);
  const [active, setActive] = useState<string[]>(cats);
  const [selected, setSelected] = useState<string | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "failed">("loading");
  const shown = useMemo(() => places.filter((p) => active.includes(p.category)).sort((a, b) => a.distance_m - b.distance_m), [places, active]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ml = await import("maplibre-gl");
        if (cancelled || !el.current) return;
        const m = new ml.Map({ container: el.current, style: STYLE_URL, center: [lon, lat], zoom: 14, attributionControl: { compact: true }, cooperativeGestures: true });
        m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        m.on("load", () => !cancelled && setMapState("ready"));
        m.on("error", (e) => { if (!m.loaded() && String(e.error?.message ?? "").includes("style")) setMapState("failed"); });
        const home = document.createElement("div");
        home.className = "h-5 w-5 rounded-md border-2 border-white bg-forest shadow-lg";
        home.setAttribute("aria-label", name);
        new ml.Marker({ element: home }).setLngLat([lon, lat])
          .setPopup(new ml.Popup({ offset: 14 }).setHTML(`<strong>${escapeHtml(name)}</strong><br/><small>${anchorExact ? "Property location" : "Approximate location"}</small>`)).addTo(m);
        map.current = m;
      } catch {
        setMapState("failed");
      }
    })();
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
  }, [lat, lon, name, anchorExact]);

  useEffect(() => {
    const m = map.current;
    if (!m || mapState !== "ready") return;
    let alive = true;
    import("maplibre-gl").then((ml) => {
      if (!alive) return;
      markers.current.forEach((mk) => mk.remove());
      markers.current = shown.map((p) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "h-3.5 w-3.5 rounded-full border-2 border-white shadow";
        dot.style.background = CATEGORY_COLORS[p.category] ?? "#193D35";
        dot.setAttribute("aria-label", `${p.name}, ${formatDistance(p.distance_m)}`);
        dot.onclick = () => setSelected(p.id);
        return new ml.Marker({ element: dot }).setLngLat([p.lon, p.lat])
          .setPopup(new ml.Popup({ offset: 10 }).setHTML(`<strong>${escapeHtml(p.name)}</strong><br/><small>${escapeHtml(CATEGORY_LABELS[p.category] ?? p.category)} · ${formatDistance(p.distance_m)} straight-line</small>`)).addTo(m);
      });
    });
    return () => { alive = false; };
  }, [shown, mapState]);

  useEffect(() => {
    const p = places.find((x) => x.id === selected);
    if (p && map.current) map.current.flyTo({ center: [p.lon, p.lat], zoom: 15.5, essential: false });
  }, [selected, places]);

  const toggle = (c: string) => setActive((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]));

  return (
    <section aria-label="Housio Around" data-testid="around">
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter places by category">
        {cats.map((c) => (
          <button key={c} onClick={() => toggle(c)} aria-pressed={active.includes(c)} className={`chip ${active.includes(c) ? "" : "opacity-50"}`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[c] }} aria-hidden />{CATEGORY_LABELS[c] ?? c}
            <span className="text-muted">{places.filter((p) => p.category === c).length}</span>
          </button>
        ))}
      </div>
      <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-[1.4fr_1fr]"}`}>
        <div className="relative h-[380px] overflow-hidden rounded-2xl border border-line bg-sage/40 sm:h-[480px]">
          <div ref={el} className="h-full w-full" />
          {mapState === "failed" && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted" data-testid="map-fallback">
              The map couldn&apos;t load right now. The list of nearby places is still available.
            </div>
          )}
        </div>
        <ol className="max-h-[480px] space-y-2 overflow-auto pr-1" aria-label="Nearby places">
          {shown.map((p) => (
            <li key={p.id}>
              <button onClick={() => setSelected(p.id)} className={`card w-full p-3 text-left transition hover:border-forest/40 ${selected === p.id ? "!border-forest" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{p.name}</p>
                    <p className="text-xs text-muted">{CATEGORY_LABELS[p.category]}{p.subtype ? ` · ${p.subtype.replace(/_/g, " ")}` : ""}</p>
                  </div>
                  <p className="whitespace-nowrap text-sm font-semibold text-forest" title="Approximate straight-line distance, not road distance">{formatDistance(p.distance_m)}</p>
                </div>
                {selected === p.id && (
                  <div className="mt-2 space-y-1 border-t border-line pt-2 text-xs text-muted">
                    {p.address && <p>{p.address}</p>}
                    {p.opening_hours && <p>Hours (from OpenStreetMap): {p.opening_hours}</p>}
                    {p.phone && <p>Phone: {p.phone}</p>}
                    <p className="flex flex-wrap gap-3">
                      <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="text-forest underline">View on OpenStreetMap</a>
                      {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer nofollow" className="text-forest underline">Website</a>}
                    </p>
                    <p>Source: {p.source_provider} ({p.source_id}), {p.licence}. Retrieved {p.retrieved_at.slice(0, 10)}.</p>
                  </div>
                )}
              </button>
            </li>
          ))}
          {!shown.length && <li className="text-sm text-muted">No places match these filters.</li>}
        </ol>
      </div>
      <p className="mt-3 text-xs text-muted">
        Distances are approximate straight-line distances from {anchorExact ? "the property" : "a central point in the neighbourhood"}, not road distances or travel times.
        Places © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> (ODbL). Map tiles by OpenFreeMap. Details may be out of date; check before you travel.
      </p>
    </section>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
