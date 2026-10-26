"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { getQuote, reserve } from "@/app/actions/booking";
import { kes } from "@/lib/format";
import { periodPrices } from "@/lib/pricing";
import { DB_MESSAGES } from "@/lib/messages";
import { POLICY_TEXT, type Policy } from "@/lib/cancellation";
import type { Quote, Unit } from "@/types";

interface Props { units: Unit[]; checkin?: string; checkout?: string; guests?: number; today: string; policy: Policy; isDemo: boolean; back: string; unavailable: Record<string, string[]> }

export function BookingPanel({ units, checkin, checkout, guests, today, policy, back, unavailable }: Props) {
  const bookable = units.filter((u) => u.is_bookable);
  const [unitId, setUnitId] = useState(bookable[0]?.id ?? "");
  const [inDate, setIn] = useState(checkin ?? "");
  const [outDate, setOut] = useState(checkout ?? "");
  const [count, setCount] = useState(guests ?? 1);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [pending, start] = useTransition();
  const [state, action, submitting] = useActionState(reserve, {});
  const unit = useMemo(() => bookable.find((u) => u.id === unitId), [bookable, unitId]);
  const prices = unit ? periodPrices(unit) : null;
  const blocked = useMemo(() => new Set(unavailable[unitId] ?? []), [unavailable, unitId]);

  useEffect(() => {
    if (!unitId || !inDate || !outDate || outDate <= inDate) return;
    let live = true;
    start(async () => {
      const q = await getQuote({ unit: unitId, checkin: inDate, checkout: outDate, guests: count });
      if (live) setQuote(q);
    });
    return () => { live = false; };
  }, [unitId, inDate, outDate, count]);
  const showQuote = inDate && outDate && outDate > inDate ? quote : null;
  const clash = inDate && outDate && [...blocked].some((d) => d >= inDate && d < outDate);

  return (
    <aside className="card p-5 lg:sticky lg:top-24" aria-label="Book this stay" data-testid="booking-panel">
      {unit && prices && (
        <div className="mb-4">
          <p><span className="font-display text-2xl font-bold text-forest">{kes(prices.nightly)}</span> <span className="text-sm text-muted">/ night</span></p>
          <p className="mt-1 text-xs text-muted">Weekly from {kes(prices.weekly)} · Monthly from {kes(prices.monthly)} (before fees)</p>
        </div>
      )}
      <form action={action} className="space-y-3">
        <input type="hidden" name="back" value={back} />
        {bookable.length > 1 && (
          <label className="block"><span className="label">Unit</span>
            <select name="unit" value={unitId} onChange={(e) => setUnitId(e.target.value)} className="input">
              {bookable.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
            </select></label>
        )}
        {bookable.length === 1 && <input type="hidden" name="unit" value={unitId} />}
        <div className="grid grid-cols-2 gap-2">
          <label className="block"><span className="label">Check in</span><input required type="date" name="checkin" min={today} value={inDate} onChange={(e) => setIn(e.target.value)} className="input" /></label>
          <label className="block"><span className="label">Check out</span><input required type="date" name="checkout" min={inDate || today} value={outDate} onChange={(e) => setOut(e.target.value)} className="input" /></label>
        </div>
        <label className="block"><span className="label">Guests</span><input required type="number" name="guests" min={1} max={unit?.max_guests ?? 1} value={count} onChange={(e) => setCount(Number(e.target.value))} className="input" /></label>
        <label className="block"><span className="label">Guest names (optional, one per line)</span><textarea name="names" rows={2} className="input" /></label>

        <div aria-live="polite" className="min-h-6">
          {pending && <p className="text-xs text-muted">Checking price and availability…</p>}
          {!pending && showQuote && !showQuote.ok && <p className="text-sm text-red-700">{showQuote.error === "network" ? "Couldn't check right now. Try again." : DB_MESSAGES[showQuote.error ?? ""] ?? "Those dates don't work."}</p>}
          {!pending && showQuote?.ok && (
            <dl className="space-y-1.5 rounded-2xl bg-ivory p-3 text-sm" data-testid="price-breakdown">
              <Row k={`${showQuote.nights} night${showQuote.nights === 1 ? "" : "s"}`} v={kes(showQuote.subtotal)} />
              {!!showQuote.discount && <Row k={`${showQuote.nights! >= 28 ? "Monthly" : "Weekly"} discount (${showQuote.discount_pct}%)`} v={`− ${kes(showQuote.discount)}`} />}
              <Row k="Cleaning fee" v={kes(showQuote.cleaning_fee)} />
              <Row k="Service fee (5%)" v={kes(showQuote.service_fee)} />
              <div className="border-t border-line pt-1.5"><Row k={<strong>Total</strong>} v={<strong data-testid="quote-total">{kes(showQuote.total)}</strong>} /></div>
              <Row k="Refundable deposit (held separately)" v={kes(showQuote.deposit)} />
              {!showQuote.available && <p className="pt-1 text-sm font-semibold text-red-700" data-testid="unavailable">These dates are not available.</p>}
            </dl>
          )}
          {clash && !showQuote && <p className="text-sm text-red-700">Some of these nights are already booked.</p>}
        </div>
        {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
        <button className="btn btn-primary w-full py-3" disabled={submitting || !showQuote?.ok || !showQuote.available}>
          {submitting ? "Holding your dates…" : "Reserve"}
        </button>
        <p className="text-center text-xs text-muted">You won&apos;t be charged yet. We hold the dates for 15 minutes while you pay.</p>
      </form>
      <div className="mt-4 border-t border-line pt-4 text-xs text-muted">
        <p><strong className="text-ink">{POLICY_TEXT[policy].title} cancellation.</strong> {POLICY_TEXT[policy].summary}</p>
      </div>
    </aside>
  );
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="text-ink">{v}</dd></div>;
}
