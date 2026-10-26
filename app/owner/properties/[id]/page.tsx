import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { ownerProperty } from "@/lib/db/owner";
import { getAmenities, getNeighbourhoods } from "@/lib/db/queries";
import { PropertyForm } from "@/components/owner/PropertyForm";
import { AvailabilityTools, ListingActions, SpacesEditor, UploadForm } from "@/components/owner/StudioTools";
import { StatusPill } from "@/components/ui/ui";
import { mainUnit } from "@/lib/listing";

export const metadata: Metadata = { title: "Manage listing" };
export const dynamic = "force-dynamic";

export default async function ManageListing({ params }: { params: Promise<{ id: string }> }) {
  const { token, user } = await requireRole(["owner"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const p = await ownerProperty(token, id).catch(() => null);
  if (!p) notFound();
  const [hoods, amenities] = await Promise.all([getNeighbourhoods(), getAmenities()]);
  const u = mainUnit(p);
  const locked = p.is_seed && user.is_protected;
  const am = Object.fromEntries(amenities.map((a) => [a.code, (u.amenities[a.code] ?? "unknown") as "yes" | "no" | "unknown"]));
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-3xl font-bold text-forest">{p.name}</h1><p className="mt-1 flex items-center gap-2 text-sm text-muted"><StatusPill status={p.status} /> {p.review_note && <span>Reviewer note: {p.review_note}</span>}</p></div>
        <div className="flex gap-2"><Link href={`/properties/${p.slug}`} className="btn btn-secondary">Preview listing</Link><ListingActions id={p.id} status={p.status} isSeed={p.is_seed} /></div>
      </div>
      <section className="card p-6"><h2 className="mb-4 font-display text-xl font-semibold text-forest">Details</h2>
        <PropertyForm id={p.id} locked={locked} neighbourhoods={hoods} amenities={amenities} initial={{
          name: p.name, property_type: p.property_type as never, unit_type: u.unit_type as never, neighbourhood: p.neighbourhood_slug, summary: p.summary, description: p.description,
          house_rules: p.house_rules, cancellation_policy: p.cancellation_policy, stay_short: p.stay_types.includes("short"), stay_long: p.stay_types.includes("long"),
          max_guests: u.max_guests, bedrooms: u.bedrooms ?? "", bathrooms: u.bathrooms ?? "", floor_area_m2: u.floor_area_m2 ?? "", nightly_rate: u.nightly_rate,
          weekly_discount_pct: u.weekly_discount_pct, monthly_discount_pct: u.monthly_discount_pct, cleaning_fee: u.cleaning_fee, deposit: u.deposit, min_nights: u.min_nights, amenities: am,
        }} /></section>
      <section className="card p-6"><h2 className="mb-4 font-display text-xl font-semibold text-forest">Availability and seasonal prices</h2>
        <AvailabilityTools units={p.units.map((x) => ({ id: x.id, name: x.name }))} blocks={p.blocks} rates={p.rates} /></section>
      <section className="card p-6"><h2 className="mb-1 font-display text-xl font-semibold text-forest">Floor plan rooms</h2>
        <p className="mb-4 text-sm text-muted">Rooms drive the SpaceMap and the generated 3D tour. Positions and sizes are in metres. Rooms are part of the unit and can&apos;t be booked on their own.</p>
        <SpacesEditor unitId={u.id} spaces={p.spaces.filter((s) => s.unit_id === u.id)} locked={locked} /></section>
      <section className="card p-6"><h2 className="mb-4 font-display text-xl font-semibold text-forest">Photos, floor plans and 3D models</h2>
        <UploadForm propertyId={p.id} assets={p.assets} locked={locked} /></section>
    </div>
  );
}
