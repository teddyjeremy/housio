"use client";

import type { PlanSpace } from "./roomPlan";

const FILL: Record<string, string> = {
  living: "#F6F2EA", bedroom: "#DDE6DC", kitchen: "#EFE6D8", bathroom: "#E3ECEF", dining: "#F2EBDD",
  balcony: "#EEF1E6", garden: "#D7E6CF", office: "#ECE9F1", meeting: "#EFE6D8", hallway: "#F4F1EA", lounge: "#F6F2EA",
};

export interface SpaceMapProps {
  spaces: (PlanSpace & { dimensions_verified?: boolean })[];
  selected: string | null;
  onSelect: (id: string) => void;
  /** Show measurements only when they come from the owner or were verified. */
  dimensionSource: "verified" | "owner" | "illustrative";
}

export function SpaceMap({ spaces, selected, onSelect, dimensionSource }: SpaceMapProps) {
  if (!spaces.length) {
    return <p className="p-6 text-sm text-muted">No floor plan is available for this unit yet. Use the photos and room list instead.</p>;
  }
  const minX = Math.min(...spaces.map((s) => s.x)), minZ = Math.min(...spaces.map((s) => s.z));
  const maxX = Math.max(...spaces.map((s) => s.x + s.width)), maxZ = Math.max(...spaces.map((s) => s.z + s.depth));
  const pad = 0.6;
  const vb = `${minX - pad} ${minZ - pad} ${maxX - minX + pad * 2} ${maxZ - minZ + pad * 2}`;
  return (
    <figure className="w-full">
      <svg viewBox={vb} className="h-auto max-h-[460px] w-full" role="group" aria-label="Interactive floor plan. Select a room to view it in 3D.">
        {spaces.map((s) => {
          const active = s.id === selected;
          const showDims = dimensionSource !== "illustrative" || s.dimensions_verified;
          return (
            <g key={s.id} role="button" tabIndex={0} aria-pressed={active} aria-label={`${s.name}${showDims ? `, ${s.width} by ${s.depth} metres` : ""}`}
              onClick={() => onSelect(s.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(s.id); } }}
              className="cursor-pointer outline-none focus-visible:[&>rect]:stroke-champagne" data-space={s.name}>
              <rect x={s.x} y={s.z} width={s.width} height={s.depth} fill={active ? "#193D35" : FILL[s.kind] ?? "#fff"}
                stroke={active ? "#C7A775" : "#193D35"} strokeWidth={active ? 0.09 : 0.05} strokeDasharray={s.kind === "balcony" || s.kind === "garden" ? "0.2 0.12" : undefined} />
              <text x={s.x + s.width / 2} y={s.z + s.depth / 2 - (showDims ? 0.12 : 0)} textAnchor="middle" fontSize={Math.min(0.34, s.width / 9)}
                fontWeight={600} fill={active ? "#F6F2EA" : "#193D35"} style={{ fontFamily: "var(--font-sans)" }}>{s.name}</text>
              {showDims && (
                <text x={s.x + s.width / 2} y={s.z + s.depth / 2 + 0.3} textAnchor="middle" fontSize={0.24} fill={active ? "#DDE6DC" : "#69716B"}>
                  {s.width.toFixed(1)} × {s.depth.toFixed(1)} m
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-xs text-muted">
        {dimensionSource === "illustrative"
          ? "Illustrative layout generated from a template. Room sizes are not verified, so measurements are hidden. Doors and windows are not shown because the source data does not include them."
          : dimensionSource === "owner" ? "Layout and measurements supplied by the owner and not independently verified." : "Measurements verified by Housio."}
      </figcaption>
    </figure>
  );
}
