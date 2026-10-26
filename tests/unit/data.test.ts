import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { LISTINGS, LAYOUTS } from "../../data/listings.mjs";
import { buildScene, modelSize } from "@/components/explore/roomPlan";

describe("demo listings", () => {
  it("has exactly the required neighbourhood distribution", () => {
    const counts: Record<string, number> = {};
    for (const l of LISTINGS) counts[l.hood] = (counts[l.hood] ?? 0) + 1;
    expect(LISTINGS).toHaveLength(10);
    expect(counts).toEqual({ westlands: 1, kilimani: 2, karen: 1, kitisuru: 2, "south-b": 1, langata: 1, gigiri: 1, runda: 1 });
  });
});

describe("room builder", () => {
  it("keeps furniture footprints inside their rooms", () => {
    for (const [name, layout] of Object.entries(LAYOUTS as Record<string, { name: string; kind: string; x: number; z: number; w: number; d: number; features?: Record<string, unknown> }[]>)) {
      const spaces = layout.map((s, i) => ({ id: `${name}-${i}`, name: s.name, kind: s.kind, x: s.x, z: s.z, width: s.w, depth: s.d, features: s.features }));
      const scene = buildScene(spaces);
      expect(scene.placements.length).toBeGreaterThan(3);
      for (const p of scene.placements) {
        const room = spaces.find((s) => s.id === p.spaceId)!;
        const [sx, , sz] = p.size ?? modelSize(p.model);
        const half = Math.max(sx, sz) / 2 * Math.SQRT1_2;
        expect(p.x, `${p.key} ${p.model}`).toBeGreaterThanOrEqual(room.x + Math.min(half, 0.05) - 0.05);
        expect(p.x).toBeLessThanOrEqual(room.x + room.width + 0.05);
        expect(p.z).toBeGreaterThanOrEqual(room.z - 0.05);
        expect(p.z).toBeLessThanOrEqual(room.z + room.depth + 0.05);
      }
    }
  });
});

describe("asset manifest", () => {
  it("lists only CC0 assets whose files exist", () => {
    const m = JSON.parse(readFileSync("data/asset-manifest.json", "utf8"));
    expect(m.assets.length).toBeGreaterThan(20);
    for (const a of m.assets) {
      expect(a.licence, a.id).toBe("CC0-1.0");
      expect(a.page_url).toMatch(/^https:\/\//);
      const files = a.file ? [a.file] : (a.files ?? []).map((f: { file: string } | string) => (typeof f === "string" ? f : f.file));
      for (const f of files) expect(existsSync(`public${f}`), f).toBe(true);
    }
  });
});
