"use client";

import Link from "next/link";
import { useCompare } from "./CompareTray";

export function CompareHint({ query }: { query: string }) {
  const items = useCompare();
  if (!items.length) return null;
  return (
    <p className="mt-4 text-sm">You have {items.length} saved for comparison. <Link className="font-semibold text-forest underline" href={`/compare${query ? query + "&" : "?"}ids=${items.map((i) => i.slug).join(",")}`}>Compare them</Link></p>
  );
}
