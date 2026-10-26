import { describe, expect, it } from "vitest";
import { checkinInstant, refundFor } from "@/lib/cancellation";

const checkin = "2026-12-20";
const before = (h: number) => new Date(checkinInstant(checkin) - h * 3_600_000);

describe("refund rules", () => {
  it("anchors check-in at 14:00 Nairobi time", () => {
    expect(new Date(checkinInstant(checkin)).toISOString()).toBe("2026-12-20T11:00:00.000Z");
  });
  it("flexible", () => {
    expect(refundFor("flexible", 10500, 500, checkin, before(24))).toBe(10500);
    expect(refundFor("flexible", 10500, 500, checkin, before(23))).toBe(5000);
    expect(refundFor("flexible", 10500, 500, checkin, before(-1))).toBe(0);
  });
  it("moderate", () => {
    expect(refundFor("moderate", 10500, 500, checkin, before(120))).toBe(10500);
    expect(refundFor("moderate", 10500, 500, checkin, before(119))).toBe(5000);
  });
  it("strict", () => {
    expect(refundFor("strict", 10500, 500, checkin, before(336))).toBe(10500);
    expect(refundFor("strict", 10500, 500, checkin, before(200))).toBe(5000);
    expect(refundFor("strict", 10500, 500, checkin, before(100))).toBe(0);
  });
});
