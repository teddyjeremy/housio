import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AroundMap } from "@/components/around/AroundMap";
import { getProperty } from "@/lib/db/queries";
import { parseSearch, stayQuery } from "@/lib/search-params";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProperty((await params).slug).catch(() => null);
  return p ? { title: `Around ${p.name}`, description: `Restaurants, shops, schools, clinics and transport near ${p.name} in ${p.neighbourhood}.`, alternates: { canonical: `/properties/${p.slug}/around` } } : { title: "Around" };
}

export default async function AroundPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const stay = parseSearch(await searchParams);
  const p = await getProperty(slug);
  if (!p) notFound();
  return (
    <div className="container-page py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Housio Around</p>
          <h1 className="font-display text-3xl font-bold text-forest">Around {p.name}</h1>
          <p className="mt-1 text-sm text-muted">{p.neighbourhood}, Nairobi · {p.nearby.length} researched places</p>
          {!p.anchor_is_exact && <div className="mt-2"><span className="text-xs text-muted">The dark square marks a central point in {p.neighbourhood}; the exact address is shared after booking.</span></div>}
        </div>
        <Link href={`/properties/${p.slug}${stayQuery(stay)}`} className="btn btn-secondary">Back to listing</Link>
      </div>
      <AroundMap lat={p.lat} lon={p.lon} name={p.name} anchorExact={p.anchor_is_exact} places={p.nearby} />
    </div>
  );
}
