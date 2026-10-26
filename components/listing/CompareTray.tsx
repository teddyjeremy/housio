"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const KEY = "housio.compare";
type Item = { slug: string; name: string };
const listeners = new Set<() => void>();
let cache: string | null = null;
let parsed: Item[] = [];

function read(): Item[] {
  const raw = typeof window === "undefined" ? "[]" : window.localStorage.getItem(KEY) ?? "[]";
  if (raw !== cache) {
    cache = raw;
    try { parsed = (JSON.parse(raw) as Item[]).slice(0, 3); } catch { parsed = []; }
  }
  return parsed;
}
function write(items: Item[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 3)));
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => { listeners.delete(l); window.removeEventListener("storage", l); };
}
const EMPTY: Item[] = [];
export function useCompare() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function CompareToggle({ slug, name }: { slug: string; name: string }) {
  const items = useCompare();
  const on = items.some((i) => i.slug === slug);
  const full = items.length >= 3 && !on;
  return (
    <button type="button" disabled={full} aria-pressed={on} title={full ? "You can compare up to three stays" : undefined}
      onClick={() => write(on ? items.filter((i) => i.slug !== slug) : [...items, { slug, name }])}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${on ? "border-forest bg-forest text-white" : "border-line text-forest"} disabled:opacity-40`}>
      {on ? "✓ Comparing" : "+ Compare"}
    </button>
  );
}

export function CompareBar({ query = "" }: { query?: string }) {
  const items = useCompare();
  if (!items.length) return null;
  const href = `/compare${query ? query + "&" : "?"}ids=${items.map((i) => i.slug).join(",")}`;
  return (
    <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4" role="region" aria-label="Compare tray">
      <div className="flex items-center gap-3 rounded-full bg-forest px-4 py-2 text-sm text-ivory shadow-xl">
        <span>{items.length} of 3 selected</span>
        <Link href={href} className="btn btn-gold py-1.5">Compare</Link>
        <button className="text-xs underline" onClick={() => write([])}>Clear</button>
      </div>
    </div>
  );
}
