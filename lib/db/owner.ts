import "server-only";
import { rpc } from "@/lib/db/rpc";
import type { Booking, PropertyCard, PropertyDetail } from "@/types";

export type OwnerDashboard = {
  profile: { business_name: string; verification_status: string } | null;
  properties: (PropertyCard & { review_note: string | null; updated_at: string; is_seed: boolean })[];
  stats: { listings: number; pending_review: number; upcoming: number; revenue_confirmed: number; nights_booked_30d: number };
};
export type OwnerProperty = PropertyDetail & { review_note: string | null; is_seed: boolean;
  blocks: { id: string; unit_id: string; from: string; to: string; reason: string }[];
  rates: { id: string; unit_id: string; from: string; to: string; nightly_rate: number }[] };

export const ownerDashboard = (t: string) => rpc<OwnerDashboard>("api_owner_dashboard", { p_token: t });
export const ownerBookings = (t: string) => rpc<Booking[]>("api_owner_bookings", { p_token: t });
export const ownerProperty = (t: string, id: string) => rpc<OwnerProperty>("api_owner_property", { p_token: t, p_property: id });
