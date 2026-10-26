// Housio room builder: turns a list of spaces (from the database) into a scene description.
// Pure and deterministic so it can be unit tested and reused on the server.
import MODELS from "./models.json";

export type ModelKey = keyof typeof MODELS;
export interface PlanSpace { id: string; name: string; kind: string; x: number; z: number; width: number; depth: number; height?: number; features?: Record<string, unknown> }
export interface Placement { key: string; model: ModelKey; x: number; y: number; z: number; rotY: number; spaceId: string; size?: [number, number, number] }
export interface ScenePlan { placements: Placement[]; bounds: { minX: number; minZ: number; maxX: number; maxZ: number }; rooms: (PlanSpace & { cx: number; cz: number; floor: Surface })[] }
export type Surface = "wood" | "tiles" | "grass";

export const STYLES: Record<string, { wall: string; accent: string; floorTint: string }> = {
  warm: { wall: "#efe6d8", accent: "#C7A775", floorTint: "#fff4e2" },
  contemporary: { wall: "#eceeea", accent: "#193D35", floorTint: "#fbf0de" },
  garden: { wall: "#e7ecdf", accent: "#5d7a52", floorTint: "#fff3e0" },
  minimal: { wall: "#f3f1ec", accent: "#69716B", floorTint: "#fffaf0" },
  classic: { wall: "#ebe2d2", accent: "#7a5a3a", floorTint: "#f7e6cc" },
};

const PI = Math.PI;
export function floorFor(kind: string): Surface {
  if (kind === "garden") return "grass";
  if (kind === "bathroom" || kind === "kitchen" || kind === "balcony") return "tiles";
  return "wood";
}

export function modelSize(m: ModelKey): [number, number, number] {
  return MODELS[m].size as [number, number, number];
}

function furnish(s: PlanSpace): Omit<Placement, "spaceId" | "key">[] {
  const w = s.width, d = s.depth, f = s.features ?? {};
  const out: Omit<Placement, "spaceId" | "key">[] = [];
  const put = (model: ModelKey, x: number, z: number, rotY = 0, y = 0, size?: [number, number, number]) => {
    const [mw, , md] = size ?? modelSize(model);
    const rotated = Math.abs(Math.sin(rotY)) > 0.5;
    const hw = (rotated ? md : mw) / 2, hd = (rotated ? mw : md) / 2;
    // Keep every item inside its room.
    if (hw * 2 > w + 0.01 || hd * 2 > d + 0.01) return;
    out.push({ model, x: Math.min(Math.max(x, hw), w - hw), z: Math.min(Math.max(z, hd), d - hd), rotY, y, size });
  };
  switch (s.kind) {
    case "living":
      if (f.bed) {
        put("bed_double", w * 0.68, 1.05, 0);
        put("nightstand", w * 0.68 - 1.15, 0.25);
        put("desk", 0.7, 0.35, 0);
        put("desk_chair", 0.7, 1.0, PI);
        put("armchair", 0.6, d - 0.7, PI * 0.75);
        put("rug", w / 2, d * 0.62, 0, 0, [2.0, 0.01, 1.4]);
        put("plant", w - 0.3, d - 0.3);
        put("floor_lamp", 0.3, d / 2);
      } else {
        put("rug", w / 2, d / 2, 0);
        put(w >= 5.5 && d >= 4.6 ? "corner_sofa" : "sofa", w / 2, d - 0.55, PI);
        put("coffee_table", w / 2, d / 2);
        put("tv_cabinet", w / 2, 0.25);
        put("television", w / 2, 0.25, 0, 0.5);
        put("armchair", 0.55, d / 2 - 0.3, PI / 2);
        put("floor_lamp", 0.3, d - 0.3);
        put("plant", w - 0.3, 0.3);
        put("side_table", w - 0.35, d - 0.4);
        put("vase", w / 2 + 0.25, d / 2, 0, 0.42);
        put("picture_frame", w - 0.03, d / 2, -PI / 2, 1.2);
      }
      break;
    case "bedroom": {
      const twin = f.bed === "twin";
      if (twin) {
        put("bed_single", w / 2 - 0.65, 1.0, 0);
        put("bed_single", w / 2 + 0.65, 1.0, 0);
        put("nightstand", w / 2, 0.22);
      } else {
        put("bed_double", w / 2, 1.05, 0);
        put("nightstand", w / 2 - 1.15, 0.22);
        put("nightstand", w / 2 + 1.15, 0.22);
      }
      put("plant", w - 0.3, d - 0.3);
      if (w > 4) put("armchair", 0.5, d - 0.6, PI * 0.75);
      else put("floor_lamp", 0.3, d - 0.3);
      if (f.desk) { put("desk", w - 0.7, d - 0.35, PI); put("desk_chair", w - 0.7, d - 1.0, 0); }
      put("picture_frame", w / 2, 0.03, 0, 1.3);
      break;
    }
    case "kitchen": {
      const row: ModelKey[] = f.kitchenette ? ["kitchen_sink", "stove"] : ["fridge", "kitchen_cabinet", "kitchen_sink", "kitchen_cabinet", "stove", "kitchen_cabinet"];
      let x = 0.05;
      for (const m of row) {
        const mw = modelSize(m)[0];
        if (x + mw > w - 0.05) break;
        put(m, x + mw / 2, 0.3);
        if (m !== "fridge") put("kitchen_upper", x + mw / 2, 0.18, 0, 1.45);
        if (m === "kitchen_cabinet" && !out.some((o) => o.model === "microwave")) put("microwave", x + mw / 2, 0.3, 0, 0.9);
        x += mw;
      }
      if (!f.kitchenette && w > 3.2 && d > 3) put("washer", w - 0.35, d - 0.35, PI);
      break;
    }
    case "dining": {
      put("dining_table", w / 2, d / 2);
      const n = w >= 3 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const cx = w / 2 - 0.55 * (n - 1) / 2 + i * 0.55;
        put("dining_chair", cx, d / 2 - 0.62, 0);
        put("dining_chair", cx, d / 2 + 0.62, PI);
      }
      put("vase", w / 2, d / 2, 0, 0.76);
      put("plant", 0.3, 0.3);
      break;
    }
    case "bathroom":
      put("bathroom_sink", 0.45, 0.25);
      put("mirror", 0.45, 0.03, 0, 1.25);
      put("toilet", w - 0.35, 0.38);
      if (w >= 2.4 && d >= 2.2) put("bathtub", w / 2, d - 0.42, PI);
      else put("shower", w - 0.5, d - 0.5);
      break;
    case "balcony":
      put("lounge_chair", 0.6, d / 2, PI / 2);
      put("side_table", 1.25, d / 2);
      put("plant", w - 0.35, d / 2);
      break;
    case "garden":
      put("lounge_chair", w * 0.3, d / 2, PI);
      put("lounge_chair", w * 0.3 + 1.0, d / 2, PI);
      put("side_table", w * 0.3 + 0.5, d / 2 + 0.2);
      put("plant", w - 0.5, 0.5);
      put("plant", 0.5, d - 0.5);
      break;
    case "office":
      put("desk", w / 2, 0.35);
      put("desk_chair", w / 2, 1.0, PI);
      put("bookcase", w - 0.2, d / 2, -PI / 2);
      put("plant", 0.3, d - 0.3);
      break;
    case "meeting": {
      put("dining_table", w / 2, d / 2, 0, 0, [2.6, 0.76, 1.1]);
      for (let i = 0; i < 4; i++) {
        const cx = w / 2 - 0.9 + i * 0.6;
        put("dining_chair", cx, d / 2 - 0.85, 0);
        put("dining_chair", cx, d / 2 + 0.85, PI);
      }
      put("tv_cabinet", w / 2, 0.25);
      put("television", w / 2, 0.25, 0, 0.5);
      put("plant", w - 0.3, d - 0.3);
      break;
    }
  }
  return out;
}

export function buildScene(spaces: PlanSpace[]): ScenePlan {
  const placements: Placement[] = [];
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  const rooms = spaces.map((s) => {
    minX = Math.min(minX, s.x); minZ = Math.min(minZ, s.z);
    maxX = Math.max(maxX, s.x + s.width); maxZ = Math.max(maxZ, s.z + s.depth);
    furnish(s).forEach((p, i) => placements.push({ ...p, x: p.x + s.x, z: p.z + s.z, spaceId: s.id, key: `${s.id}-${i}` }));
    return { ...s, cx: s.x + s.width / 2, cz: s.z + s.depth / 2, floor: floorFor(s.kind) };
  });
  if (!spaces.length) { minX = minZ = 0; maxX = maxZ = 1; }
  return { placements, rooms, bounds: { minX, minZ, maxX, maxZ } };
}

export function modelInfo(m: ModelKey) {
  return MODELS[m];
}
export const ALL_MODELS = Object.keys(MODELS) as ModelKey[];
