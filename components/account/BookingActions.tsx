"use client";

import { useActionState, useState, useTransition } from "react";
import { cancelBooking, submitReview } from "@/app/actions/booking";
import { kes } from "@/lib/format";

export function CancelButton({ id, refund }: { id: string; refund: number | null }) {
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (msg) return <p role="status" className="text-sm text-forest">{msg}</p>;
  return confirm ? (
    <div className="rounded-xl bg-ivory p-3 text-sm">
      <p>Cancel now and receive <strong>{kes(refund ?? 0)}</strong> back under this booking&apos;s policy?</p>
      <div className="mt-2 flex gap-2">
        <button className="btn btn-primary py-1.5" disabled={pending} data-testid="confirm-cancel"
          onClick={() => start(async () => { const r = await cancelBooking(id); setMsg(r.ok ? `Cancelled. Refund: ${kes(r.data.refund)}.` : r.error); })}>Yes, cancel</button>
        <button className="btn btn-ghost py-1.5" onClick={() => setConfirm(false)}>Keep booking</button>
      </div>
    </div>
  ) : <button className="btn btn-secondary" onClick={() => setConfirm(true)} data-testid="cancel">Cancel booking</button>;
}

export function ReviewForm({ booking }: { booking: string }) {
  const [state, action, pending] = useActionState(submitReview, {});
  if (state.ok) return <p role="status" className="text-sm text-forest">Thanks! Your review will appear once it has been moderated.</p>;
  return (
    <form action={action} className="space-y-2" data-testid="review-form">
      <input type="hidden" name="booking" value={booking} />
      <label className="block"><span className="label">Rating</span>
        <select name="rating" className="input w-32" defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}</select></label>
      <label className="block"><span className="label">Your review</span><textarea name="body" rows={3} required minLength={10} className="input" /></label>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>Submit review</button>
    </form>
  );
}
