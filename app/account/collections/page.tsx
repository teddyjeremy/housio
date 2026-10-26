import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { myCollections } from "@/app/actions/collections";
import { CollectionTools } from "@/components/account/CollectionTools";
import { Empty } from "@/components/ui/ui";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = { title: "Saved collections", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  await requireRole(["guest", "owner", "admin"]);
  const cols = await myCollections();
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-forest">Saved collections</h1>
      <p className="mt-1 text-sm text-muted">Share a shortlist with family, friends or colleagues. Anyone signed in with the link can vote.</p>
      <div className="mt-6"><CollectionTools /></div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2" data-testid="collections">
        {cols.length === 0 && <li className="sm:col-span-2"><Empty title="No collections yet">Use “Save” on any listing.</Empty></li>}
        {cols.map((c) => (
          <li key={c.id} className="card p-5">
            <p className="font-display text-lg font-semibold text-forest">{c.name}</p>
            <p className="text-sm text-muted">{c.slugs.length} stay{c.slugs.length === 1 ? "" : "s"}</p>
            <p className="mt-3 break-all rounded-lg bg-ivory p-2 font-mono text-xs" data-testid="share-link">{SITE_URL}/collections/{c.share_token}</p>
            <div className="mt-3 flex gap-2">
              <Link href={`/collections/${c.share_token}`} className="btn btn-secondary py-1.5">Open</Link>
              {c.slugs.length > 0 && <Link href={`/compare?ids=${c.slugs.slice(0, 3).join(",")}`} className="btn btn-ghost py-1.5">Compare</Link>}
              <CollectionTools deleteId={c.id} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
