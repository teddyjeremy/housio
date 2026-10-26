import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Explore } from "@/components/explore/Explore";
import { TrustBadge } from "@/components/ui/ui";
import { getProperty } from "@/lib/db/queries";
import { parseSearch, stayQuery } from "@/lib/search-params";
import { dimensionSource, mainUnit, modelTrust, unitSpaces } from "@/lib/listing";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProperty((await params).slug).catch(() => null);
  return { title: p ? `${p.name} · 3D tour` : "3D tour" };
}

export default async function ExplorePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const stay = parseSearch(sp);
  const p = await getProperty(slug);
  if (!p) notFound();
  const unitId = typeof sp.unit === "string" && p.units.some((u) => u.id === sp.unit) ? sp.unit : mainUnit(p).id;
  const unit = p.units.find((u) => u.id === unitId)!;
  const spaces = unitSpaces(p, unitId);
  const mode = sp.mode === "plan" ? "plan" : sp.mode === "photos" ? "photos" : "3d";
  const render = sp.render === "1";
  const room = typeof sp.room === "string" ? spaces[Number(sp.room)]?.id ?? null : null;
  return (
    <div className="container-page py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Housio Explore</p>
          <h1 className="font-display text-3xl font-bold text-forest">{p.name}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">{p.is_demo && <TrustBadge kind="demo" />}<TrustBadge kind={modelTrust(p)} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.units.filter((u) => p.spaces.some((s) => s.unit_id === u.id)).length > 1 && p.units.filter((u) => p.spaces.some((s) => s.unit_id === u.id)).map((u) => (
            <Link key={u.id} href={`/properties/${p.slug}/explore${stayQuery(stay, { unit: u.id })}`} className={`chip ${u.id === unitId ? "!bg-forest !text-white" : ""}`}>{u.name}</Link>
          ))}
          <Link href={`/properties/${p.slug}${stayQuery(stay)}`} className="btn btn-secondary">Back to listing</Link>
          <Link href={`/properties/${p.slug}/around${stayQuery(stay)}`} className="btn btn-secondary">Around</Link>
        </div>
      </div>
      <Explore spaces={spaces} style={unit.scene_style} photos={p.assets} modelTrust={modelTrust(p)} dimensionSource={dimensionSource(p, unitId)}
        initialMode={mode} initialSpace={room} autoLoad renderMode={render} />
      <p className="mt-3 text-xs text-muted">
        {modelTrust(p) === "illustrative_model"
          ? "This interior is generated from a template using CC0 furniture models and textures. It shows a plausible layout and style and is not a replica of this property."
          : "This model was supplied by the owner and verified by Housio."}{" "}
        <Link href="/licences" className="underline">Asset licences</Link>
      </p>
    </div>
  );
}
