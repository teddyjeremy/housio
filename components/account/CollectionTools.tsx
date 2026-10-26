"use client";

import { useState, useTransition } from "react";
import { deleteCollection, saveToCollection, vote } from "@/app/actions/collections";

export function CollectionTools({ deleteId }: { deleteId?: string }) {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (deleteId) return <button className="btn btn-ghost py-1.5 text-red-700" disabled={pending} onClick={() => start(async () => { await deleteCollection(deleteId); })}>Delete</button>;
  return (
    <form className="flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveToCollection(null, name, null); setMsg(r.ok ? "Created" : r.error); setName(""); }); }}>
      <input aria-label="Collection name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Family trip, March" className="input" />
      <button className="btn btn-primary" disabled={pending}>Create</button>
      {msg && <span role="status" className="self-center text-xs text-forest">{msg}</span>}
    </form>
  );
}

export function VoteButtons({ share, slug, mine, up, down, signedIn }: { share: string; slug: string; mine: number | null; up: number; down: number; signedIn: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const cast = (v: -1 | 0 | 1) => start(async () => { const r = await vote(share, slug, v); if (!r.ok) setErr(r.error); });
  if (!signedIn) return <p className="text-xs text-muted">👍 {up} · 👎 {down} · <a className="underline" href={`/login?next=/collections/${share}`}>Sign in to vote</a></p>;
  return (
    <div className="flex items-center gap-2 text-sm">
      <button aria-pressed={mine === 1} disabled={pending} onClick={() => cast(mine === 1 ? 0 : 1)} className={`chip ${mine === 1 ? "!bg-forest !text-white" : ""}`}>👍 {up}</button>
      <button aria-pressed={mine === -1} disabled={pending} onClick={() => cast(mine === -1 ? 0 : -1)} className={`chip ${mine === -1 ? "!bg-ink !text-white" : ""}`}>👎 {down}</button>
      {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
    </div>
  );
}
