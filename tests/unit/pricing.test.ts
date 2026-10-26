import { describe, expect, it } from "vitest";
import { addDays, nightsBetween, periodPrices, priceStay } from "@/lib/pricing";

const unit = { nightly_rate: 10000, weekly_discount_pct: 10, monthly_discount_pct: 25, cleaning_fee: 1500, deposit: 10000, min_nights: 2, max_nights: 90, max_guests: 2 };

describe("pricing", () => {
  it("counts nights across month ends", () => {
    expect(nightsBetween("2026-10-30", "2026-11-02")).toBe(3);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("prices a short stay with cleaning and service fees", () => {
    const r = priceStay(unit, "2026-11-01", "2026-11-04", 2);
    expect(r).toMatchObject({ ok: true, nights: 3, subtotal: 30000, discount: 0, service_fee: 1500, total: 33000, deposit: 10000 });
  });
  it("applies weekly and monthly discounts", () => {
    const w = priceStay(unit, "2026-11-01", "2026-11-08", 1);
    expect(w.ok && w.discount_pct).toBe(10);
    const m = priceStay(unit, "2026-11-01", "2026-11-29", 1);
    expect(m.ok && m.discount_pct).toBe(25);
    if (m.ok) expect(m.total).toBe(280000 - 70000 + 1500 + 10500);
  });
  it("uses rate overrides per night", () => {
    const r = priceStay(unit, "2026-12-23", "2026-12-26", 1, [{ from: "2026-12-24", to: "2026-12-26", nightly_rate: 15000 }]);
    expect(r.ok && r.subtotal).toBe(40000);
  });
  it("rejects invalid stays", () => {
    expect(priceStay(unit, "2026-11-04", "2026-11-01", 1)).toEqual({ ok: false, error: "invalid_dates" });
    expect(priceStay(unit, "2026-11-01", "2026-11-02", 1)).toEqual({ ok: false, error: "min_nights" });
    expect(priceStay(unit, "2026-11-01", "2027-03-01", 1)).toEqual({ ok: false, error: "max_nights" });
    expect(priceStay(unit, "2026-11-01", "2026-11-04", 3)).toEqual({ ok: false, error: "capacity" });
  });
  it("derives indicative period prices", () => {
    expect(periodPrices(unit)).toEqual({ nightly: 10000, weekly: 63000, monthly: 225000 });
  });
});
