import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { myBookings, myNotifications } from "@/lib/db/account";
import { BookingList } from "@/components/account/BookingList";
import { Empty } from "@/components/ui/ui";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { token } = await requireRole(["guest", "owner", "admin"]);
  const [bookings, notes] = await Promise.all([myBookings(token), myNotifications(token)]);
  const upcoming = bookings.filter((b) => b.status === "confirmed" || b.status === "pending");
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <section>
        <h1 className="font-display text-3xl font-bold text-forest">Your trips</h1>
        <div className="mt-5">{upcoming.length ? <BookingList bookings={upcoming} /> : <Empty title="No upcoming stays" href="/search" cta="Find a stay" />}</div>
        <p className="mt-4 text-sm"><Link href="/account/bookings" className="font-semibold text-forest underline">All bookings and history</Link></p>
      </section>
      <section aria-labelledby="notes">
        <h2 id="notes" className="font-display text-xl font-semibold text-forest">Notifications</h2>
        <ul className="mt-4 space-y-2" data-testid="notifications">
          {notes.length === 0 && <li className="text-sm text-muted">Nothing new.</li>}
          {notes.map((n) => (
            <li key={n.id} className={`card p-3 text-sm ${n.read ? "" : "!border-champagne"}`}>
              {n.link ? <Link href={n.link} className="hover:underline">{n.message}</Link> : n.message}
              <p className="mt-1 text-xs text-muted">{formatDate(n.created_at)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
