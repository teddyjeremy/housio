import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { rpc } from "@/lib/db/rpc";
import { getSessionToken } from "@/lib/auth/session";
import { PropertyCard } from "@/components/listing/PropertyCard";
import { VoteButtons } from "@/components/account/CollectionTools";
import type { PropertyCard as Card } from "@/types";

export const metadata: Metadata = { title: "Shared shortlist", robots: { index: false } };
export const dynamic = "force-dynamic";

type Shared = { name: string; owner_name: string; share_token: string; is_owner: boolean; items: (Card & { votes_up: number; votes_down: number; my_vote: number | null })[] };

export default async function SharedCollection({ params }: { params: Promise<{ share: string }> }) {
  const { share } = await params;
  if (!/^[a-f0-9]{24}$/.test(share)) notFound();
  const token = await getSessionToken();
  const c = await rpc<Shared | null>("api_shared_collection", { p_share: share, p_token: token });
  if (!c) notFound();
  const ranked = [...c.items].sort((a, b) => (b.votes_up - b.votes_down) - (a.votes_up - a.votes_down));
  return (
    <div className="container-page py-10">
      <p className="eyebrow">Shared by {c.owner_name}</p>
      <h1 className="font-display text-3xl font-bold text-forest">{c.name}</h1>
      <p className="mt-1 text-sm text-muted">Vote on the stays you prefer. The list is ordered by votes.</p>
      {ranked.length > 1 && <Link href={`/compare?ids=${ranked.slice(0, 3).map((i) => i.slug).join(",")}`} className="btn btn-secondary mt-4">Compare top three</Link>}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ranked.map((p) => (
          <div key={p.slug} className="space-y-2">
            <PropertyCard p={p} />
            <VoteButtons share={c.share_token} slug={p.slug} mine={p.my_vote} up={p.votes_up} down={p.votes_down} signedIn={!!token} />
          </div>
        ))}
        {!ranked.length && <p className="text-sm text-muted">This shortlist is empty.</p>}
      </div>
    </div>
  );
}
