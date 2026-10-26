import { describe, expect, it } from "vitest";
import { parseSearch, stayQuery, toQuery } from "@/lib/search-params";
import { rolesForPath, safeNext } from "@/lib/auth/roles";

describe("search params", () => {
  it("parses valid values and drops invalid ones", () => {
    const p = parseSearch({ neighbourhood: "kilimani", guests: "3", min_price: "abc", amenities: "wifi,parking", checkin: "2026-11-01", checkout: "2026-11-05" });
    expect(p).toEqual({ neighbourhood: "kilimani", guests: 3, amenities: ["wifi", "parking"], checkin: "2026-11-01", checkout: "2026-11-05" });
  });
  it("drops reversed dates", () => {
    expect(parseSearch({ checkin: "2026-11-05", checkout: "2026-11-01" })).toEqual({});
  });
  it("round-trips through toQuery", () => {
    const p = parseSearch({ q: "garden", guests: "2", stay: "long" });
    expect(parseSearch(Object.fromEntries(new URLSearchParams(toQuery(p).slice(1))))).toEqual(p);
    expect(stayQuery({ guests: 2 }, { view: "3d" })).toBe("?guests=2&view=3d");
  });
});

describe("roles", () => {
  it("protects areas by role", () => {
    expect(rolesForPath("/owner/bookings")).toEqual(["owner"]);
    expect(rolesForPath("/admin")).toEqual(["admin"]);
    expect(rolesForPath("/search")).toBeNull();
  });
  it("only redirects to safe, permitted paths", () => {
    expect(safeNext("//evil.example", "guest")).toBe("/account");
    expect(safeNext("https://evil.example", "guest")).toBe("/account");
    expect(safeNext("/admin", "guest")).toBe("/account");
    expect(safeNext("/properties/x", "guest")).toBe("/properties/x");
    expect(safeNext("/owner", "owner")).toBe("/owner");
  });
});
