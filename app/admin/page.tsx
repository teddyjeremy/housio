import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { adminOverview } from "@/lib/db/admin";
import { ModerateReview, OwnerVerify } from "@/components/admin/AdminTools";
import { Stat } from "@/components/ui/ui";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const { token } = await requireRole(["admin"]);
  const d = await adminOverview(token);
  return (
    <div className="space-y-10">
      <h1 className="font-display text-3xl font-bold text-forest">Overview</h1>
      <div className="grid gap-3 sm:grid-cols-4" data-testid="admin-counts">
        <Stat label="Published" value={d.counts.published} /><Stat label="Featured" value={d.counts.published_demo} />
        <Stat label="Awaiting review" value={d.counts.pending_review} /><Stat label="Nearby places" value={d.counts.nearby_places} />
        <Stat label="Owners" value={d.counts.owners} /><Stat label="Guests" value={d.counts.guests} />
        <Stat label="Live bookings" value={d.counts.bookings_live} /><Stat label="Reviews to moderate" value={d.counts.reviews_pending} />
      </div>
      <section><h2 className="font-display text-xl font-semibold text-forest">Listings by neighbourhood</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-4" data-testid="distribution">{Object.entries(d.by_neighbourhood).map(([k, v]) => <li key={k} className="card flex justify-between p-3 text-sm"><span>{k}</span><strong>{v}</strong></li>)}</ul></section>
      <section><h2 className="font-display text-xl font-semibold text-forest">Reviews awaiting moderation</h2>
        <ul className="mt-3 space-y-2" data-testid="pending-reviews">
          {d.reviews.length === 0 && <li className="text-sm text-muted">None.</li>}
          {d.reviews.map((r) => <li key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><div><p className="font-semibold">{r.property} · {"★".repeat(r.rating)} · {r.author}</p><p className="text-muted">{r.body}</p></div><ModerateReview id={r.id} /></li>)}
        </ul></section>
      <section><h2 className="font-display text-xl font-semibold text-forest">Owner verification</h2>
        <table className="mt-3 w-full text-sm"><tbody>{d.owners_list.map((o) => (
          <tr key={o.id} className="border-t border-line"><td className="p-2">{o.business_name}</td><td className="p-2 text-muted">{o.email}</td><td className="p-2">{o.verification_status}</td><td className="p-2">{!o.is_demo && <OwnerVerify id={o.id} status={o.verification_status} />}</td></tr>
        ))}</tbody></table></section>
      <section><h2 className="font-display text-xl font-semibold text-forest">Recent activity</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted">{d.audit.map((a, i) => <li key={i}>{formatDate(a.at)} · {a.role} · {a.action}</li>)}</ul></section>
    </div>
  );
}
