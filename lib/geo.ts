export const EARTH_RADIUS_M = 6_371_008.8;

/** Great-circle (straight-line) distance in metres between two WGS84 points. */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const dp = r(lat2 - lat1);
  const dl = r(lon2 - lon1);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restaurants & cafés", hospital: "Hospitals & clinics", pharmacy: "Pharmacies", shopping: "Supermarkets & malls",
  transport: "Transport", education: "Schools & universities", fitness: "Gyms & sports", park: "Parks & attractions", business: "Offices & business",
};
export const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "#C7A775", hospital: "#B4413C", pharmacy: "#3E7C6B", shopping: "#6B5B95", transport: "#2F6690",
  education: "#8A6D3B", fitness: "#D9822B", park: "#4F8A3C", business: "#5B6770",
};
