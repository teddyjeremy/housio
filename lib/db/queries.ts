import "server-only";
import { cache } from "react";
import { rpc } from "@/lib/db/rpc";
import { getSessionToken } from "@/lib/auth/session";
import type { SearchParams } from "@/lib/search-params";
import type { PropertyCard, PropertyDetail } from "@/types";

export const getNeighbourhoods = cache(async () =>
  rpc<{ slug: string; name: string; lat: number; lon: number; count: number }[]>("api_neighbourhoods"));

export const getAmenities = cache(async () => rpc<{ code: string; label: string; category: string }[]>("api_amenities"));

export async function searchProperties(p: SearchParams): Promise<PropertyCard[]> {
  return rpc<PropertyCard[]>("api_search", { p_filters: p });
}

export const getProperty = cache(async (slug: string): Promise<PropertyDetail | null> => {
  const token = await getSessionToken();
  return rpc<PropertyDetail | null>("api_property", { p_slug: slug, p_token: token });
});

export async function getUnavailable(unitId: string, from: string, to: string): Promise<string[]> {
  return rpc<string[]>("api_unavailable_dates", { p_unit: unitId, p_from: from, p_to: to });
}

export async function compareProperties(slugs: string[], checkin?: string, checkout?: string, guests?: number) {
  return rpc<(PropertyDetail & { card: PropertyCard })[]>("api_compare", {
    p_slugs: slugs.slice(0, 3), p_checkin: checkin ?? null, p_checkout: checkout ?? null, p_guests: guests ?? 1,
  });
}
