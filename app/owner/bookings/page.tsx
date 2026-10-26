import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { ownerBookings } from "@/lib/db/owner";
import { Empty, StatusPill } from "@/components/ui/ui";
import { formatDate, kes } from "@/lib/format";

export const metadata: Metadata = { title: "Reservations" };
export const dynamic = "force-dynamic";

export default async function OwnerBookings() {
  const { token } = await requireRole(["owner"]);
  const list = await ownerBookings(token);
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-forest">Reservations</h1>
      {list.length === 0 ? <div className="mt-6"><Empty title="No reservations yet" /></div> : (
        <div className="mt-6 overflow-x-auto"><table className="w-full text-sm" data-testid="owner-bookings">
          <thead><tr className="text-left text-muted"><th className="p-2">Reference</th><th className="p-2">Listing</th><th className="p-2">Guest</th><th className="p-2">Dates</th><th className="p-2">Total</th><th className="p-2">Status</th></tr></thead>
          <tbody>{list.map((b) => (
            <tr key={b.id} className="border-t border-line"><td className="p-2 font-mono">{b.reference}</td><td className="p-2">{b.property.name} · {b.unit.code}</td><td className="p-2">{b.guest_name}</td>
              <td className="p-2">{formatDate(b.checkin)} → {formatDate(b.checkout)}</td><td className="p-2">{kes(b.total)}</td><td className="p-2"><StatusPill status={b.status} /></td></tr>
          ))}</tbody></table></div>
      )}
    </>
  );
}
