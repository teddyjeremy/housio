"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveToCollection } from "@/app/actions/collections";

export function SaveButton({ slug, signedIn, collections }: { slug: string; signedIn: boolean; collections: { id: string; name: string; slugs: string[] }[] }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  if (!signedIn) return <Link href={`/login?next=/properties/${slug}`} className="btn btn-secondary">♡ Save</Link>;
  const saved = collections.some((c) => c.slugs.includes(slug));
  return (
    <div className="relative">
      <button className="btn btn-secondary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{saved ? "♥ Saved" : "♡ Save"}</button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-line bg-white p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Save to a collection</p>
          <ul className="space-y-1">
            {collections.map((c) => {
              const on = c.slugs.includes(slug);
              return (
                <li key={c.id}>
                  <button disabled={pending} className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-sage/50"
                    onClick={() => start(async () => { const r = await saveToCollection(c.id, null, slug, !on); setMsg(r.ok ? (on ? "Removed" : `Saved to ${c.name}`) : r.error); })}>
                    {on ? "✓ " : ""}{c.name}
                  </button>
                </li>
              );
            })}
          </ul>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; start(async () => { const r = await saveToCollection(null, name, slug, true); setMsg(r.ok ? `Saved to ${name}` : r.error); setName(""); }); }}>
            <input aria-label="New collection name" value={name} onChange={(e) => setName(e.target.value)} placeholder="New collection" className="input py-1.5" />
            <button className="btn btn-primary px-3 py-1.5" disabled={pending}>Add</button>
          </form>
          {msg && <p role="status" className="mt-2 text-xs text-forest">{msg}</p>}
        </div>
      )}
    </div>
  );
}
