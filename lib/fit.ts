import type { PropertyCard, Unit } from "@/types";

// Housio Fit: transparent, rule-based matching on stored listing data only.
// Every criterion reports "match", "no" or "unknown"; unknown never counts as a match.
export type Verdict = "match" | "no" | "unknown";
export interface Criterion { key: string; label: string; weight: number; test: (p: PropertyCard, u: Unit) => Verdict; explain: string }

const amen = (code: string) => (_p: PropertyCard, u: Unit): Verdict => {
  const v = u.amenities[code];
  return v === "yes" ? "match" : v === "no" ? "no" : "unknown";
};
const near = (cat: string, km: number) => (p: PropertyCard): Verdict => {
  const d = p.nearby_closest?.[cat];
  if (d == null) return "unknown";
  return d <= km * 1000 ? "match" : "no";
};

export const CRITERIA: Record<string, Criterion> = {
  work: { key: "work", label: "Work from home", weight: 3, test: (p, u) => combine(amen("workspace")(p, u), amen("wifi")(p, u)), explain: "Dedicated workspace and Wi-Fi listed as available." },
  family: { key: "family", label: "Family-friendly layout", weight: 3, test: (p, u) => (u.bedrooms ?? 0) >= 2 ? amen("family")(p, u) === "no" ? "no" : "match" : u.amenities.family === "yes" ? "match" : "no", explain: "Two or more bedrooms, or listed as family-friendly." },
  separate_beds: { key: "separate_beds", label: "Separate bedrooms", weight: 2, test: (_p, u) => (u.bedrooms == null ? "unknown" : u.bedrooms >= 2 ? "match" : "no"), explain: "At least two separate bedrooms." },
  kitchen: { key: "kitchen", label: "Full kitchen", weight: 2, test: amen("kitchen_full"), explain: "A full kitchen is listed (a kitchenette does not count)." },
  step_free: { key: "step_free", label: "Step-free access", weight: 3, test: amen("step_free"), explain: "Owner lists step-free access." },
  elevator: { key: "elevator", label: "Lift / elevator", weight: 1, test: amen("elevator"), explain: "Building lift listed." },
  parking: { key: "parking", label: "Parking", weight: 2, test: amen("parking"), explain: "Parking listed." },
  internet: { key: "internet", label: "Internet", weight: 2, test: amen("wifi"), explain: "Wi-Fi listed. Speeds are not verified." },
  ac: { key: "ac", label: "Air conditioning", weight: 1, test: amen("ac"), explain: "Air conditioning listed." },
  outdoor: { key: "outdoor", label: "Outdoor space", weight: 2, test: (p, u) => best(amen("balcony")(p, u), amen("garden")(p, u)), explain: "Balcony or garden listed." },
  long_stay: { key: "long_stay", label: "Long stays", weight: 2, test: (p, u) => (p.stay_types.includes("long") && u.monthly_discount_pct > 0 ? "match" : p.stay_types.includes("long") ? "match" : "no"), explain: "Accepts long stays (28+ nights)." },
  near_hospital: { key: "near_hospital", label: "Hospital or clinic within 2 km", weight: 2, test: near("hospital", 2), explain: "Straight-line distance to the nearest OpenStreetMap hospital or clinic." },
  near_shops: { key: "near_shops", label: "Supermarket within 1.5 km", weight: 2, test: near("shopping", 1.5), explain: "Straight-line distance to the nearest supermarket or mall." },
  near_food: { key: "near_food", label: "Restaurants within 1 km", weight: 1, test: near("restaurant", 1), explain: "Straight-line distance to the nearest restaurant or café." },
  near_fitness: { key: "near_fitness", label: "Gym within 2 km", weight: 1, test: (p, u) => best(amen("gym")(p, u), near("fitness", 2)(p)), explain: "On-site gym or one within 2 km." },
  near_transport: { key: "near_transport", label: "Transport stop within 800 m", weight: 1, test: near("transport", 0.8), explain: "Straight-line distance to the nearest mapped bus stop or station." },
};

function combine(a: Verdict, b: Verdict): Verdict {
  if (a === "no" || b === "no") return "no";
  if (a === "unknown" || b === "unknown") return "unknown";
  return "match";
}
function best(a: Verdict, b: Verdict): Verdict {
  if (a === "match" || b === "match") return "match";
  if (a === "unknown" || b === "unknown") return "unknown";
  return "no";
}

export interface FitResult { property: PropertyCard; unit: Unit; score: number; max: number; details: { key: string; label: string; verdict: Verdict; explain: string }[] }

export function rankFit(properties: PropertyCard[], keys: string[], guests = 1): FitResult[] {
  const chosen = keys.map((k) => CRITERIA[k]).filter(Boolean);
  const max = chosen.reduce((n, c) => n + c.weight, 0);
  const out: FitResult[] = [];
  for (const p of properties) {
    const units = p.units.filter((u) => u.is_bookable && u.max_guests >= guests && u.unit_type !== "meeting_room");
    for (const u of units.slice(0, 1)) {
      const details = chosen.map((c) => ({ key: c.key, label: c.label, verdict: c.test(p, u), explain: c.explain }));
      const score = chosen.reduce((n, c, i) => n + (details[i].verdict === "match" ? c.weight : 0), 0);
      out.push({ property: p, unit: u, score, max, details });
    }
  }
  return out.sort((a, b) => b.score - a.score || a.unit.nightly_rate - b.unit.nightly_rate);
}
