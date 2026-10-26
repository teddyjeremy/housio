import panoramas from "@/data/panoramas.json";
import type { Asset } from "@/types";

export interface TourRoom { id: string; label: string; url: string; low: string | null; yaw: number; kind: string }

const byFile = new Map(panoramas.panoramas.map((p) => [p.file, p]));

/** Builds the 360-degree tour from a listing's panorama assets, in display order. */
export function tourRooms(assets: Asset[]): TourRoom[] {
  return assets.filter((a) => a.kind === "panorama").map((a) => {
    const meta = byFile.get(a.url);
    return { id: a.id, label: a.caption || "Room", url: a.url, low: meta?.low ?? null, yaw: meta?.yaw ?? 0, kind: meta?.kind ?? kindFromLabel(a.caption) };
  });
}

export function kindFromLabel(label: string): string {
  const l = label.toLowerCase();
  if (/bath|shower|en-suite|toilet/.test(l)) return "bathroom";
  if (/bed/.test(l)) return "bedroom";
  if (/kitchen/.test(l)) return "kitchen";
  if (/studio/.test(l)) return "studio";
  return "living";
}

const SPACE_KIND: Record<string, string> = { living: "living", lounge: "living", dining: "living", bedroom: "bedroom", bathroom: "bathroom", kitchen: "kitchen" };

/** The tour room that best matches a floor-plan space, or -1. */
export function roomForSpace(rooms: TourRoom[], space: { name: string; kind: string }): number {
  const exact = rooms.findIndex((r) => r.label.toLowerCase() === space.name.toLowerCase());
  if (exact >= 0) return exact;
  const kind = SPACE_KIND[space.kind] ?? kindFromLabel(space.name);
  const idx = rooms.findIndex((r) => r.kind === kind);
  return idx >= 0 ? idx : rooms.findIndex((r) => r.kind === "studio");
}

/** The floor-plan space that best matches a tour room, or null. */
export function spaceForRoom<T extends { id: string; name: string; kind: string }>(spaces: T[], room: TourRoom | undefined): string | null {
  if (!room) return null;
  const exact = spaces.find((s) => s.name.toLowerCase() === room.label.toLowerCase());
  if (exact) return exact.id;
  const match = spaces.find((s) => (SPACE_KIND[s.kind] ?? kindFromLabel(s.name)) === (room.kind === "studio" ? "living" : room.kind));
  return match?.id ?? null;
}
