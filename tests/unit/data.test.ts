import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { LISTINGS, LAYOUTS } from "../../data/listings.mjs";
import panos from "@/data/panoramas.json";
import { roomForSpace, spaceForRoom, tourRooms } from "@/lib/tour";
import type { Asset } from "@/types";

describe("demo listings", () => {
  it("has exactly the required neighbourhood distribution", () => {
    const counts: Record<string, number> = {};
    for (const l of LISTINGS) counts[l.hood] = (counts[l.hood] ?? 0) + 1;
    expect(LISTINGS).toHaveLength(10);
    expect(counts).toEqual({ westlands: 1, kilimani: 2, karen: 1, kitisuru: 2, "south-b": 1, langata: 1, gigiri: 1, runda: 1 });
  });
});

describe("room panoramas", () => {
  it("are CC0, exist on disk in full and preview sizes, and cover every listing", () => {
    for (const p of panos.panoramas) {
      expect(p.licence, p.id).toBe("CC0-1.0");
      expect(p.page_url).toMatch(/^https:\/\/polyhaven\.com\/a\//);
      expect(existsSync(`public${p.file}`)).toBe(true);
      expect(existsSync(`public${p.low}`)).toBe(true);
      expect(p.low_bytes).toBeLessThan(200_000);
    }
    const ids = new Set(panos.panoramas.map((p) => p.id));
    for (const l of LISTINGS) {
      const tour = (panos.tours as Record<string, { room: string; panorama: string }[]>)[l.slug];
      expect(tour?.length, l.slug).toBeGreaterThanOrEqual(2);
      for (const r of tour) expect(ids.has(r.panorama)).toBe(true);
      for (const s of (panos.stills as Record<string, { file: string }[]>)[l.slug]) expect(existsSync(`public${s.file}`)).toBe(true);
    }
  });

  it("maps floor-plan rooms to tour rooms and back", () => {
    const assets = panos.tours["kilimani-family-apartment"].map((r, i) => ({ id: `a${i}`, kind: "panorama", url: panos.panoramas.find((p) => p.id === r.panorama)!.file, caption: r.room } as Asset));
    const rooms = tourRooms(assets);
    expect(rooms.map((r) => r.kind)).toEqual(["living", "kitchen", "bedroom", "bathroom"]);
    expect(rooms[0].low).toMatch(/-low\.webp$/);
    const spaces = (LAYOUTS.two_bed as { name: string; kind: string }[]).map((s, i) => ({ id: `s${i}`, name: s.name, kind: s.kind }));
    const bath = spaces.find((s) => s.kind === "bathroom")!;
    expect(rooms[roomForSpace(rooms, bath)].kind).toBe("bathroom");
    expect(spaces.find((s) => s.id === spaceForRoom(spaces, rooms[2]))!.kind).toBe("bedroom");
  });
});
