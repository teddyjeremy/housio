import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { LISTINGS, LAYOUTS } from "../../data/listings.mjs";
import panos from "@/data/panoramas.json";
import { kindFromLabel, roomForSpace, spaceForRoom, tourRooms } from "@/lib/tour";
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
  it("have permitted licences, exist on disk in full and preview sizes, and cover every listing", () => {
    for (const p of panos.panoramas) {
      expect(["CC0-1.0", "Public domain", "CC-BY-2.0", "CC-BY-4.0", "CC-BY-SA-4.0"], p.id).toContain(p.licence);
      expect(p.page_url).toMatch(/^https:\/\/(polyhaven\.com\/a\/|commons\.wikimedia\.org\/wiki\/File:)/);
      if (p.attribution_required) expect(p.creator.length, p.id).toBeGreaterThan(1);
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

describe("panorama audit", () => {
  it("never reuses a panorama file or image across or within listings", async () => {
    const { createHash } = await import("node:crypto");
    const { readFileSync } = await import("node:fs");
    const byFile = new Map(panos.panoramas.map((p) => [p.id, p.file]));
    const files: string[] = [];
    const hashes: string[] = [];
    for (const rooms of Object.values(panos.tours as Record<string, { panorama: string }[]>)) {
      for (const r of rooms) {
        const file = byFile.get(r.panorama)!;
        files.push(file);
        hashes.push(createHash("sha256").update(readFileSync(`public${file}`)).digest("hex"));
      }
    }
    expect(new Set(files).size).toBe(files.length);
    expect(new Set(hashes).size).toBe(hashes.length);
    const all = panos.panoramas.map((p) => createHash("sha256").update(readFileSync(`public${p.file}`)).digest("hex"));
    expect(new Set(all).size).toBe(all.length);
  });

  it("labels every room with the room type its panorama is tagged as", () => {
    const kinds = new Map(panos.panoramas.map((p) => [p.id, p.kind]));
    for (const [slug, rooms] of Object.entries(panos.tours as Record<string, { room: string; panorama: string }[]>)) {
      for (const r of rooms) {
        const tagged = kinds.get(r.panorama);
        const fromLabel = kindFromLabel(r.room);
        const ok = tagged === fromLabel || (tagged === "kitchen" && /kitchen/i.test(r.room));
        expect(ok, `${slug}: "${r.room}" uses a ${tagged} panorama`).toBe(true);
      }
    }
  });
});
