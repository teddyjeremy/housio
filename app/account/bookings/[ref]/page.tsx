import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { myBooking } from "@/lib/db/account";
import { CancelButton, ReviewForm } from "@/components/account/BookingActions";
import { Notice, StatusPill } from "@/components/ui/ui";
import { formatDate, kes } from "@/lib/format";
import { POLICY_TEXT } from "@/lib/cancellation";

export const metadata: Metadata = { title: "Booking" };
export const dynamic = "force-dynamic";

export default async function BookingPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ confirmed?: string }> }) {
  const { token } = await requireRole(["guest", "owner", "admin"]);
  const b = await myBooking(token, (await params).ref);
  if (!b) notFound();
  const sp = await searchParams;
  return (
    <div className="max-w-2xl space-y-6">
      {sp.confirmed && b.status === "confirmed" && <Notice tone="success">Your booking is confirmed. Reference <strong>{b.reference}</strong>.{b.is_demo ? " (Demo booking, no money moved.)" : ""}</Notice>}
      <div className="flex items-center justify-between"><h1 className="font-display text-3xl font-bold text-forest" data-testid="booking-ref">{b.reference}</h1><StatusPill status={b.status} /></div>
      <div className="card p-5 text-sm">
        <p className="font-display text-lg font-semibold text-forest"><Link href={`/properties/${b.property.slug}`} className="hover:underline">{b.property.name}</Link></p>
        <p className="text-muted">{b.unit.name} ({b.unit.code}) · {b.property.neighbourhood}</p>
        <p className="mt-3">{formatDate(b.checkin)} → {formatDate(b.checkout)} · {b.nights} nights · {b.guests} guests</p>
        <dl className="mt-4 space-y-1">
          <div className="flex justify-between"><dt>Total</dt><dd className="font-semibold">{kes(b.total)}</dd></div>
          <div className="flex justify-between text-muted"><dt>Deposit</dt><dd>{kes(b.deposit)}</dd></div>
          {b.refund_amount != null && <div className="flex justify-between"><dt>Refund</dt><dd data-testid="refund">{kes(b.refund_amount)}</dd></div>}
        </dl>
        <p className="mt-4 text-xs text-muted">{POLICY_TEXT[b.cancellation_policy].title}: {POLICY_TEXT[b.cancellation_policy].summary}</p>
      </div>
      {b.status === "confirmed" && <CancelButton id={b.id} refund={b.refund_if_cancelled_now} />}
      {b.can_review && <div className="card p-5"><h2 className="mb-3 font-display text-lg font-semibold text-forest">Review your stay</h2><ReviewForm booking={b.id} /></div>}
    </div>
  );
}
