import type { PropertyDetail } from "@/types";

export function mainUnit(p: PropertyDetail) {
  return p.units.find((u) => u.parent_unit_id === null && u.unit_type !== "meeting_room") ?? p.units[0];
}
export function unitSpaces(p: PropertyDetail, unitId: string) {
  return p.spaces.filter((s) => s.unit_id === unitId).map((s) => ({ ...s, x: Number(s.x), z: Number(s.z), width: Number(s.width), depth: Number(s.depth), height: Number(s.height) }));
}
export function modelTrust(p: PropertyDetail): "illustrative_model" | "verified_model" {
  return p.assets.some((a) => a.kind === "model" && a.trust_label === "verified_model") ? "verified_model" : "illustrative_model";
}
export function dimensionSource(p: PropertyDetail, unitId: string): "verified" | "owner" | "illustrative" {
  const sp = p.spaces.filter((s) => s.unit_id === unitId);
  if (sp.length && sp.every((s) => s.dimensions_verified)) return "verified";
  return p.is_demo ? "illustrative" : "owner";
}
