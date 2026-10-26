import type { TrustLabel } from "@/types";

export const TRUST: Record<TrustLabel | "owner_info" | "verified_info" | "demo", { label: string; tone: "verified" | "owner" | "illustrative" | "demo"; help: string }> = {
  actual_photo: { label: "Owner photo", tone: "owner", help: "Photograph supplied by the owner." },
  verified_model: { label: "Verified 3D model", tone: "verified", help: "A property-specific model checked by Housio against the real unit." },
  illustrative_model: { label: "Illustrative 3D", tone: "illustrative", help: "A template-generated interior. It shows a possible layout and style, not this exact property." },
  illustrative_render: { label: "Illustrative render", tone: "illustrative", help: "Rendered from a template-generated interior. Not a photograph of this property." },
  owner_floor_plan: { label: "Owner floor plan", tone: "owner", help: "Floor plan supplied by the owner; not independently measured." },
  owner_info: { label: "Owner-provided", tone: "owner", help: "Supplied by the owner and not independently verified." },
  verified_info: { label: "Verified", tone: "verified", help: "Independently checked by Housio." },
  demo: { label: "Demo listing", tone: "demo", help: "A fictional listing for demonstration. It is not a real rental and cannot be booked for real." },
};
