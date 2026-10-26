"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moderateReview, reviewListing, verifyOwner } from "@/app/actions/admin";

function useAct() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) => start(async () => { const r = await fn(); if (!r.ok) setErr((r as { error: string }).error); else { setErr(null); router.refresh(); } });
  return { act, pending, err };
}

export function ReviewListing({ id }: { id: string }) {
  const { act, pending, err } = useAct();
  const [note, setNote] = useState("");
  return (
    <div className="space-y-2">
      <textarea aria-label="Reviewer note" className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to owner (required when requesting changes)" />
      <div className="flex gap-2">
        <button className="btn btn-primary py-1.5" disabled={pending} onClick={() => act(() => reviewListing(id, "approve", note))} data-testid="approve">Approve and publish</button>
        <button className="btn btn-secondary py-1.5" disabled={pending} onClick={() => act(() => reviewListing(id, "reject", note))} data-testid="reject">Request changes</button>
      </div>
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
    </div>
  );
}

export function OwnerVerify({ id, status }: { id: string; status: string }) {
  const { act, pending, err } = useAct();
  return (
    <span className="flex items-center gap-2">
      {status !== "verified" && <button className="text-xs underline" disabled={pending} onClick={() => act(() => verifyOwner(id, "verified"))}>Verify</button>}
      {status !== "rejected" && <button className="text-xs underline" disabled={pending} onClick={() => act(() => verifyOwner(id, "rejected"))}>Reject</button>}
      {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
    </span>
  );
}

export function ModerateReview({ id }: { id: string }) {
  const { act, pending, err } = useAct();
  return (
    <span className="flex gap-2">
      <button className="btn btn-primary py-1" disabled={pending} onClick={() => act(() => moderateReview(id, "published"))} data-testid="publish-review">Publish</button>
      <button className="btn btn-secondary py-1" disabled={pending} onClick={() => act(() => moderateReview(id, "rejected"))}>Reject</button>
      {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
    </span>
  );
}
