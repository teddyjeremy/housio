"use client";

import { useState, useTransition } from "react";
import { pay } from "@/app/actions/booking";

export function PayButtons({ id, reference }: { id: string; reference: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const go = (o: "success" | "fail") => start(async () => { const r = await pay(id, reference, o); if (r && !r.ok) setErr(r.error); });
  return (
    <div className="space-y-3">
      <button className="btn btn-primary w-full py-3" disabled={pending} onClick={() => go("success")} data-testid="pay">{pending ? "Processing…" : "Confirm and pay (simulated)"}</button>
      <button className="btn btn-secondary w-full" disabled={pending} onClick={() => go("fail")} data-testid="pay-fail">Simulate a failed payment</button>
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
    </div>
  );
}
