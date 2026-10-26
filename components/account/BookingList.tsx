import Link from "next/link";
import { StatusPill } from "@/components/ui/ui";
import { formatDate, kes } from "@/lib/format";
import type { Booking } from "@/types";

export function BookingList({ bookings }: { bookings: Booking[] }) {
  return (
    <ul className="space-y-3" data-testid="booking-list">
      {bookings.map((b) => (
        <li key={b.id}>
          <Link href={b.status === "pending" ? `/checkout/${b.reference}` : `/account/bookings/${b.reference}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-forest/40">
            <div>
              <p className="font-semibold text-forest">{b.property.name}</p>
              <p className="text-sm text-muted">{formatDate(b.checkin)} → {formatDate(b.checkout)} · {b.reference}{b.is_demo ? " · demo" : ""}</p>
            </div>
            <div className="flex items-center gap-3"><span className="text-sm font-semibold">{kes(b.total)}</span><StatusPill status={b.status} /></div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
