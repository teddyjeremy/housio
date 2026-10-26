import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { haversine } from "@/lib/geo";

const pois = JSON.parse(readFileSync("data/pois.json", "utf8"));
const anchors: { slug: string; lat: number; lon: number }[] = JSON.parse(readFileSync("data/anchors.json", "utf8"));

describe("haversine", () => {
  it("is zero for the same point and ~111 km per degree of latitude", () => {
    expect(haversine(-1.28, 36.8, -1.28, 36.8)).toBe(0);
    expect(haversine(0, 36.8, 1, 36.8)).toBeGreaterThan(111_000);
    expect(haversine(0, 36.8, 1, 36.8)).toBeLessThan(111_400);
  });
});

describe("nearby places provenance", () => {
  it("covers every listing with licensed, linked OSM records", () => {
    expect(pois.licence).toBe("ODbL-1.0");
    for (const a of anchors) {
      const entry = pois.anchors[a.slug];
      expect(entry, a.slug).toBeDefined();
      expect(entry.places.length).toBeGreaterThan(10);
      for (const p of entry.places) {
        expect(p.osm_id).toBeTypeOf("number");
        expect(p.source_url).toMatch(/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/);
        const d = haversine(a.lat, a.lon, p.lat, p.lon);
        expect(Math.abs(d - p.distance_m)).toBeLessThan(2);
        expect(p.distance_m).toBeLessThanOrEqual(pois.radius_m);
      }
    }
  });
});
