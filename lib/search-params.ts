import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const searchSchema = z.object({
  q: z.string().max(80).optional(),
  neighbourhood: z.string().max(40).optional(),
  type: z.string().max(40).optional(),
  checkin: date.optional(),
  checkout: date.optional(),
  guests: z.coerce.number().int().min(1).max(30).optional(),
  min_price: z.coerce.number().int().min(0).max(2_000_000).optional(),
  max_price: z.coerce.number().int().min(0).max(2_000_000).optional(),
  amenities: z.array(z.string().max(30)).max(20).optional(),
  stay: z.enum(["short", "long"]).optional(),
});
export type SearchParams = z.infer<typeof searchSchema>;

type Raw = Record<string, string | string[] | undefined>;

export function parseSearch(raw: Raw): SearchParams {
  const pick = (k: string) => {
    const v = raw[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s === "" ? undefined : s;
  };
  const am = raw.amenities;
  const input = {
    q: pick("q"), neighbourhood: pick("neighbourhood"), type: pick("type"), checkin: pick("checkin"), checkout: pick("checkout"),
    guests: pick("guests"), min_price: pick("min_price"), max_price: pick("max_price"), stay: pick("stay"),
    amenities: am === undefined ? undefined : (Array.isArray(am) ? am : am.split(",")).filter(Boolean),
  };
  const out: SearchParams = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    const r = (searchSchema.shape as Record<string, z.ZodTypeAny>)[k].safeParse(v);
    if (r.success) (out as Record<string, unknown>)[k] = r.data;
  }
  if (out.checkin && out.checkout && out.checkout <= out.checkin) {
    delete out.checkin;
    delete out.checkout;
  }
  return out;
}

/** Keeps dates and guests when moving between listing, Around, Compare and Explore. */
export function stayQuery(p: Pick<SearchParams, "checkin" | "checkout" | "guests">, extra: Record<string, string | undefined> = {}): string {
  const s = new URLSearchParams();
  if (p.checkin) s.set("checkin", p.checkin);
  if (p.checkout) s.set("checkout", p.checkout);
  if (p.guests) s.set("guests", String(p.guests));
  for (const [k, v] of Object.entries(extra)) if (v) s.set(k, v);
  const str = s.toString();
  return str ? `?${str}` : "";
}

export function toQuery(p: SearchParams): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === "") continue;
    s.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const str = s.toString();
  return str ? `?${str}` : "";
}
