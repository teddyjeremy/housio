import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { myBookings } from "@/lib/db/account";
import { BookingList } from "@/components/account/BookingList";
import { Empty } from "@/components/ui/ui";

export const metadata: Metadata = { title: "Bookings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const { token } = await requireRole(["guest", "owner", "admin"]);
  const bookings = await myBookings(token);
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-forest">Reservation history</h1>
      <div className="mt-5">{bookings.length ? <BookingList bookings={bookings} /> : <Empty title="No bookings yet" href="/search" cta="Find a stay" />}</div>
    </>
  );
}
