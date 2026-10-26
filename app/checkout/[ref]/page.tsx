import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { myBooking } from "@/lib/db/account";
import { PayButtons } from "@/components/account/PayButtons";
import { formatDate, kes } from "@/lib/format";
import { POLICY_TEXT } from "@/lib/cancellation";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Checkout({ params }: { params: Promise<{ ref: string }> }) {
  const { token } = await requireRole(["guest", "owner", "admin"]);
  const b = await myBooking(token, (await params).ref);
  if (!b) notFound();
  if (b.status !== "pending") redirect(`/account/bookings/${b.reference}`);
  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
      <div>
        <p className="eyebrow">Checkout</p>
        <h1 className="font-display text-3xl font-bold text-forest">Review and pay</h1>
        <p className="mt-2 text-sm text-muted">We&apos;re holding these dates until {new Date(b.expires_at!).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" })} (Nairobi time). Availability is checked again when you pay.</p>
        <div className="card mt-6 p-5">
          <p className="font-display text-lg font-semibold text-forest">{b.property.name}</p>
          <p className="text-sm text-muted">{b.unit.name} ({b.unit.code}) · {b.property.neighbourhood}</p>
          <p className="mt-3 text-sm">{formatDate(b.checkin)} → {formatDate(b.checkout)} · {b.nights} nights · {b.guests} guest{b.guests > 1 ? "s" : ""}</p>
          {b.guest_names.length > 0 && <p className="text-sm text-muted">Guests: {b.guest_names.join(", ")}</p>}
          <p className="mt-3 text-xs text-muted"><strong>{POLICY_TEXT[b.cancellation_policy].title} cancellation:</strong> {POLICY_TEXT[b.cancellation_policy].summary}</p>
        </div>
      </div>
      <aside className="card p-5">
        <dl className="space-y-1.5 text-sm" data-testid="checkout-breakdown">
          <div className="flex justify-between"><dt>{b.nights} nights</dt><dd>{kes(b.subtotal)}</dd></div>
          {b.discount > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>− {kes(b.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Cleaning fee</dt><dd>{kes(b.cleaning_fee)}</dd></div>
          <div className="flex justify-between"><dt>Service fee</dt><dd>{kes(b.service_fee)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd>{kes(b.total)}</dd></div>
          <div className="flex justify-between text-muted"><dt>Refundable deposit</dt><dd>{kes(b.deposit)}</dd></div>
        </dl>
        {b.is_demo ? (
          <div className="mt-5 space-y-3">
            <PayButtons id={b.id} reference={b.reference} />
          </div>
        ) : <p className="mt-5 text-sm text-muted">Online payment for this listing isn&apos;t enabled yet.</p>}
      </aside>
    </div>
  );
}
