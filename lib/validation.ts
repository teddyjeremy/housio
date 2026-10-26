import { z } from "zod";

export const PROPERTY_TYPES = ["serviced_apartment", "studio", "holiday_home", "furnished_home", "suite", "private_room", "meeting_room", "lounge", "other"] as const;
export const UNIT_TYPES = ["apartment", "studio", "suite", "house", "room", "meeting_room", "lounge", "facility"] as const;

const optInt = (min: number, max: number) => z.union([z.literal(""), z.coerce.number().int().min(min).max(max)]).optional();

export const propertySchema = z.object({
  name: z.string().trim().min(3, "At least 3 characters.").max(120),
  property_type: z.enum(PROPERTY_TYPES),
  unit_type: z.enum(UNIT_TYPES),
  neighbourhood: z.string().min(1, "Choose a neighbourhood."),
  summary: z.string().trim().max(300),
  description: z.string().trim().max(5000),
  house_rules: z.string().trim().max(2000),
  cancellation_policy: z.enum(["flexible", "moderate", "strict"]),
  stay_short: z.boolean(),
  stay_long: z.boolean(),
  max_guests: z.coerce.number().int().min(1).max(30),
  bedrooms: optInt(0, 20),
  bathrooms: z.union([z.literal(""), z.coerce.number().min(0).max(20)]).optional(),
  floor_area_m2: z.union([z.literal(""), z.coerce.number().positive().max(100000)]).optional(),
  nightly_rate: z.coerce.number().int().min(500, "Minimum KES 500.").max(2_000_000),
  weekly_discount_pct: z.coerce.number().int().min(0).max(50),
  monthly_discount_pct: z.coerce.number().int().min(0).max(70),
  cleaning_fee: z.coerce.number().int().min(0).max(200_000),
  deposit: z.coerce.number().int().min(0).max(2_000_000),
  min_nights: z.coerce.number().int().min(1).max(365),
  amenities: z.record(z.string(), z.enum(["yes", "no", "unknown"])),
}).refine((v) => v.stay_short || v.stay_long, { message: "Choose at least one stay type.", path: ["stay_short"] });
export type PropertyInput = z.input<typeof propertySchema>;

export const spaceSchema = z.object({
  name: z.string().trim().min(1).max(60),
  kind: z.enum(["living", "bedroom", "kitchen", "bathroom", "dining", "balcony", "office", "hallway", "meeting", "lounge", "garden"]),
  x: z.coerce.number().min(-50).max(100),
  z: z.coerce.number().min(-50).max(100),
  width: z.coerce.number().positive().max(50),
  depth: z.coerce.number().positive().max(50),
});
export const dateRange = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).refine((r) => r.to > r.from, "End date must be after start date.");
