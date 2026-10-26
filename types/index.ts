export type Role = "guest" | "owner" | "admin";
export type AmenityValue = "yes" | "no" | "unknown";
export type TrustLabel = "actual_photo" | "verified_model" | "illustrative_model" | "illustrative_render" | "owner_floor_plan" | "sample_photo";

export interface CurrentUser {
  id: string;
  role: Role;
  display_name: string;
  email: string;
  is_demo: boolean;
  is_protected: boolean;
  unread: number;
  owner_verification: string | null;
}

export interface Quote {
  ok: boolean;
  error?: string;
  nights?: number;
  subtotal?: number;
  discount_pct?: number;
  discount?: number;
  cleaning_fee?: number;
  service_fee?: number;
  total?: number;
  deposit?: number;
  currency?: string;
  available?: boolean;
  min_nights?: number;
  max_nights?: number;
  max_guests?: number;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  unit_type: string;
  max_guests: number;
  bedrooms: number | null;
  bathrooms: number | null;
  sleeping: { room: string; beds: string }[];
  floor_area_m2: number | null;
  floor_area_verified: boolean;
  nightly_rate: number;
  weekly_discount_pct: number;
  monthly_discount_pct: number;
  cleaning_fee: number;
  deposit: number;
  min_nights: number;
  max_nights: number;
  parent_unit_id: string | null;
  is_bookable: boolean;
  scene_style: string;
  amenities: Record<string, AmenityValue>;
  quote: Quote | null;
}

export interface PropertyCard {
  id: string;
  slug: string;
  name: string;
  property_type: string;
  neighbourhood: string;
  neighbourhood_slug: string;
  summary: string;
  lat: number;
  lon: number;
  anchor_is_exact: boolean;
  is_demo: boolean;
  status: string;
  cancellation_policy: "flexible" | "moderate" | "strict";
  stay_types: string[];
  cover: { url: string; trust_label: TrustLabel; caption: string } | null;
  rating: number | null;
  review_count: number;
  nearby_count: number;
  nearby_closest: Record<string, number> | null;
  units: Unit[];
}

export interface Space {
  id: string;
  unit_id: string;
  name: string;
  kind: string;
  sort: number;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  dimensions_verified: boolean;
  features: Record<string, unknown>;
  separately_bookable_unit_id: string | null;
}

export interface Asset {
  id: string;
  unit_id: string | null;
  kind: "photo" | "model" | "floor_plan" | "texture" | "render" | "panorama";
  trust_label: TrustLabel;
  url: string;
  caption: string;
  source: string;
  licence: string | null;
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  subtype: string | null;
  lat: number;
  lon: number;
  distance_m: number;
  distance_kind: "straight_line" | "route";
  source_provider: string;
  source_id: string;
  source_url: string;
  licence: string;
  retrieved_at: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  verification_status: string;
}

export interface PropertyDetail extends PropertyCard {
  description: string;
  house_rules: string;
  anchor_note: string;
  owner: { name: string; verification_status: string } | null;
  spaces: Space[];
  assets: Asset[];
  amenity_details: { unit_id: string; code: string; label: string; category: string; value: AmenityValue; detail: string | null; info_source: string }[];
  nearby: NearbyPlace[];
  reviews: { id: string; rating: number; body: string; author: string; created_at: string }[];
  verification: { field: string; status: string; method: string; notes: string | null; at: string }[];
}

export interface Booking {
  id: string;
  reference: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "expired" | "payment_failed";
  checkin: string;
  checkout: string;
  nights: number;
  guests: number;
  subtotal: number;
  discount: number;
  cleaning_fee: number;
  service_fee: number;
  total: number;
  deposit: number;
  refund_amount: number | null;
  currency: string;
  cancellation_policy: "flexible" | "moderate" | "strict";
  is_demo: boolean;
  payment_mode: string;
  expires_at: string | null;
  created_at: string;
  unit: { id: string; code: string; name: string };
  property: { slug: string; name: string; neighbourhood: string };
  guest_name: string | null;
  guest_names: string[];
  can_review: boolean;
  refund_if_cancelled_now: number | null;
}
