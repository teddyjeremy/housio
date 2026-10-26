// Client-side mirror of app.quote() in the database. The database is authoritative;
// this module is used for display and is covered by unit tests that pin the rules.
export interface RateInput {
  nightly_rate: number;
  weekly_discount_pct: number;
  monthly_discount_pct: number;
  cleaning_fee: number;
  deposit: number;
  min_nights: number;
  max_nights: number;
  max_guests: number;
}
export interface RateOverride { from: string; to: string; nightly_rate: number }
export const SERVICE_FEE_RATE = 0.05;

export function nightsBetween(checkin: string, checkout: string): number {
  const a = Date.parse(`${checkin}T00:00:00Z`);
  const b = Date.parse(`${checkout}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type PriceResult =
  | { ok: true; nights: number; subtotal: number; discount_pct: number; discount: number; cleaning_fee: number; service_fee: number; total: number; deposit: number }
  | { ok: false; error: "invalid_dates" | "min_nights" | "max_nights" | "capacity" };

export function priceStay(unit: RateInput, checkin: string, checkout: string, guests: number, overrides: RateOverride[] = []): PriceResult {
  const nights = nightsBetween(checkin, checkout);
  if (nights < 1) return { ok: false, error: "invalid_dates" };
  if (nights < unit.min_nights) return { ok: false, error: "min_nights" };
  if (nights > unit.max_nights) return { ok: false, error: "max_nights" };
  if (guests < 1 || guests > unit.max_guests) return { ok: false, error: "capacity" };
  let subtotal = 0;
  for (let i = 0; i < nights; i++) {
    const day = addDays(checkin, i);
    const o = overrides.find((r) => day >= r.from && day < r.to);
    subtotal += o ? o.nightly_rate : unit.nightly_rate;
  }
  const discount_pct = nights >= 28 ? unit.monthly_discount_pct : nights >= 7 ? unit.weekly_discount_pct : 0;
  const discount = Math.round((subtotal * discount_pct) / 100);
  const service_fee = Math.round((subtotal - discount) * SERVICE_FEE_RATE);
  return { ok: true, nights, subtotal, discount_pct, discount, cleaning_fee: unit.cleaning_fee, service_fee, total: subtotal - discount + unit.cleaning_fee + service_fee, deposit: unit.deposit };
}

/** Indicative weekly and monthly prices for listing pages (before cleaning and service fees). */
export function periodPrices(unit: Pick<RateInput, "nightly_rate" | "weekly_discount_pct" | "monthly_discount_pct">) {
  return {
    nightly: unit.nightly_rate,
    weekly: Math.round(unit.nightly_rate * 7 * (1 - unit.weekly_discount_pct / 100)),
    monthly: Math.round(unit.nightly_rate * 30 * (1 - unit.monthly_discount_pct / 100)),
  };
}
