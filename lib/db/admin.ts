import "server-only";
import { rpc } from "@/lib/db/rpc";
import type { PropertyCard } from "@/types";

export type AdminOverview = {
  counts: Record<string, number>;
  by_neighbourhood: Record<string, number>;
  pending: (PropertyCard & { owner: string; submitted_at: string; description: string })[];
  owners_list: { id: string; name: string; email: string; business_name: string; verification_status: string; is_demo: boolean }[];
  reviews: { id: string; rating: number; body: string; status: string; property: string; author: string; created_at: string }[];
  audit: { action: string; role: string; target: string; at: string }[];
};
export const adminOverview = (t: string) => rpc<AdminOverview>("api_admin_overview", { p_token: t });
