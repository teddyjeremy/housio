import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { ownerDashboard } from "@/lib/db/owner";
import { Empty, Stat, StatusPill } from "@/components/ui/ui";
import { kes } from "@/lib/format";

export const metadata: Metadata = { title: "Owner Studio" };
export const dynamic = "force-dynamic";

export default async function OwnerHome() {
  const { token } = await requireRole(["owner"]);
  const d = await ownerDashboard(token);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-forest">Your listings</h1>
          <p className="text-sm text-muted">{d.profile?.business_name} · owner verification: <strong>{d.profile?.verification_status}</strong></p>
        </div>
        <Link href="/owner/properties/new" className="btn btn-primary">New listing</Link>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-5" data-testid="owner-stats">
        <Stat label="Live listings" value={d.stats.listings} /><Stat label="In review" value={d.stats.pending_review} />
        <Stat label="Upcoming stays" value={d.stats.upcoming} /><Stat label="Nights ±30 days" value={d.stats.nights_booked_30d} />
        <Stat label="Booked value" value={kes(d.stats.revenue_confirmed)} />
      </div>
      <ul className="mt-8 space-y-3" data-testid="owner-properties">
        {d.properties.length === 0 && <li><Empty title="No listings yet" href="/owner/properties/new" cta="Create a listing" /></li>}
        {d.properties.map((p) => (
          <li key={p.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold text-forest">{p.name}</p>
              <p className="text-sm text-muted">{p.neighbourhood} · {p.units.length} unit{p.units.length > 1 ? "s" : ""}</p>
              {p.review_note && p.status === "rejected" && <p className="mt-1 text-xs text-red-700">Reviewer note: {p.review_note}</p>}
            </div>
            <div className="flex items-center gap-2">
              <StatusPill status={p.status} />
              <Link href={`/properties/${p.slug}`} className="btn btn-ghost py-1.5">Preview</Link>
              <Link href={`/owner/properties/${p.id}`} className="btn btn-secondary py-1.5">Manage</Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
