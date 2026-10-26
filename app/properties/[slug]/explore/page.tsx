import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Explore } from "@/components/explore/Explore";
import { getProperty } from "@/lib/db/queries";
import { parseSearch, stayQuery } from "@/lib/search-params";
import { dimensionSource, mainUnit, unitSpaces } from "@/lib/listing";
import { tourRooms } from "@/lib/tour";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProperty((await params).slug).catch(() => null);
  return { title: p ? `${p.name} · 360° tour` : "360° tour" };
}

export default async function ExplorePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const stay = parseSearch(sp);
  const p = await getProperty(slug);
  if (!p) notFound();
  const unitId = typeof sp.unit === "string" && p.units.some((u) => u.id === sp.unit) ? sp.unit : mainUnit(p).id;
  const spaces = unitSpaces(p, unitId);
  const mode = sp.mode === "plan" ? "plan" : sp.mode === "photos" ? "photos" : "tour";
  const room = typeof sp.room === "string" ? Math.max(0, Number(sp.room) || 0) : 0;
  return (
    <div className="container-page py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">360° tour</p>
          <h1 className="font-display text-3xl font-bold text-forest">{p.name}</h1>
          <p className="mt-1 text-sm text-muted">{p.neighbourhood}, Nairobi</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/properties/${p.slug}${stayQuery(stay)}`} className="btn btn-secondary">Back to listing</Link>
          <Link href={`/properties/${p.slug}/around${stayQuery(stay)}`} className="btn btn-secondary">Around</Link>
        </div>
      </div>
      <Explore rooms={tourRooms(p.assets)} spaces={spaces} photos={p.assets} dimensionSource={dimensionSource(p, unitId)}
        initialMode={mode} initialRoom={room} renderMode={sp.render === "1"} />
    </div>
  );
}
