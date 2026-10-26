// Runs against a provisioned Housio database. Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const PASSWORD = "HousioDemo123!";

type Json = Record<string, unknown> & { ok?: boolean; error?: string };
async function rpc(fn: string, args: Record<string, unknown> = {}): Promise<Json> {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key!, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}
const login = async (email: string) => (await rpc("api_login", { p_email: email, p_password: PASSWORD, p_client: "integration" })).token as string;
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!url || !key)("database", () => {
  let guest: string, guest2: string, owner: string, admin: string, unitId: string;
  const created: [string, string][] = [];

  beforeAll(async () => {
    [guest, guest2, owner, admin] = await Promise.all(["guest", "guest2", "owner", "admin"].map((r) => login(`${r}@demo.housio.local`)));
    const p = await rpc("api_property", { p_slug: "south-b-business-studio" });
    unitId = (p.units as { id: string }[])[0].id;
  });
  afterAll(async () => {
    for (const [token, id] of created) await rpc("api_cancel_booking", { p_token: token, p_booking: id });
  });

  it("blocks direct table access", async () => {
    const res = await fetch(`${url}/rest/v1/bookings?select=*`, { headers: { apikey: key! } });
    expect(res.ok).toBe(false);
  });

  it("allows only one of two simultaneous bookings for the same dates", async () => {
    const start = 250 + Math.floor(Math.random() * 300);
    const args = { p_unit: unitId, p_checkin: day(start), p_checkout: day(start + 3), p_guests: 1, p_names: [] };
    const [a, b] = await Promise.all([rpc("api_create_booking", { ...args, p_token: guest }), rpc("api_create_booking", { ...args, p_token: guest2 })]);
    const wins = [a, b].filter((r) => r.ok);
    expect(wins).toHaveLength(1);
    expect([a, b].find((r) => !r.ok)?.error).toBe("unavailable");
    const winner = a.ok ? guest : guest2;
    const booking = { id: wins[0].booking_id as string };
    created.push([winner, booking.id]);
    const paid = await rpc("api_pay_booking", { p_token: winner, p_booking: booking.id, p_outcome: "success" });
    expect(paid.ok).toBe(true);
    const cancel = await rpc("api_cancel_booking", { p_token: winner, p_booking: booking.id });
    expect(cancel.ok).toBe(true);
    const again = await rpc("api_create_booking", { ...args, p_token: guest });
    expect(again.ok).toBe(true);
    created.push([guest, again.booking_id as string]);
  });

  it("refuses owner and admin functions to guests", async () => {
    expect((await rpc("api_owner_dashboard", { p_token: guest })).ok).not.toBe(true);
    expect((await rpc("api_admin_overview", { p_token: guest })).ok).not.toBe(true);
    expect((await rpc("api_admin_overview", { p_token: owner })).ok).not.toBe(true);
    expect((await rpc("api_admin_overview", { p_token: admin })).ok).not.toBe(false);
  });

  it("stops owners booking their own listing", async () => {
    const r = await rpc("api_create_booking", { p_token: owner, p_unit: unitId, p_checkin: day(600), p_checkout: day(603), p_guests: 1, p_names: [] });
    expect(r.error).toBe("own_listing");
  });
});
