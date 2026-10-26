import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { adminOverview } from "@/lib/db/admin";
import { ReviewListing } from "@/components/admin/AdminTools";
import { Empty } from "@/components/ui/ui";
import { formatDate, kes, TYPE_LABELS } from "@/lib/format";

export const metadata: Metadata = { title: "Listing review" };
export const dynamic = "force-dynamic";

export default async function ListingReview() {
  const { token } = await requireRole(["admin"]);
  const d = await adminOverview(token);
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-forest">Listings awaiting review</h1>
      <ul className="mt-6 space-y-4" data-testid="review-queue">
        {d.pending.length === 0 && <li><Empty title="Nothing to review" /></li>}
        {d.pending.map((p) => (
          <li key={p.id} className="card grid gap-4 p-5 md:grid-cols-[1fr_360px]">
            <div>
              <p className="font-display text-lg font-semibold text-forest">{p.name}</p>
              <p className="text-sm text-muted">{TYPE_LABELS[p.property_type]} · {p.neighbourhood} · by {p.owner} · submitted {formatDate(p.submitted_at)}</p>
              <p className="mt-2 text-sm">{p.summary}</p>
              <p className="mt-1 text-sm text-muted">{p.description}</p>
              <p className="mt-2 text-sm">{p.units.map((u) => `${u.code}: ${u.max_guests} guests, ${kes(u.nightly_rate)}/night`).join(" · ")}</p>
              <Link href={`/properties/${p.slug}`} className="mt-2 inline-block text-sm font-semibold text-forest underline">Open preview</Link>
            </div>
            <ReviewListing id={p.id} />
          </li>
        ))}
      </ul>
    </>
  );
}
