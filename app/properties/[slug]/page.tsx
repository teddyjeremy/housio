import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Explore } from "@/components/explore/Explore";
import { BookingPanel } from "@/components/booking/BookingPanel";
import { AvailabilityCalendar } from "@/components/booking/AvailabilityCalendar";
import { SaveButton } from "@/components/listing/SaveButton";
import { CompareBar, CompareToggle } from "@/components/listing/CompareTray";
import { getProperty, getUnavailable } from "@/lib/db/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { myCollections } from "@/app/actions/collections";
import { parseSearch, stayQuery } from "@/lib/search-params";
import { formatDate, kes, todayNairobi, TYPE_LABELS } from "@/lib/format";
import { addDays } from "@/lib/pricing";
import { dimensionSource, mainUnit, unitSpaces } from "@/lib/listing";
import { tourRooms } from "@/lib/tour";
import { DEFAULT_IMAGE, listingJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { CATEGORY_LABELS, formatDistance } from "@/lib/geo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProperty((await params).slug).catch(() => null);
  if (!p) return { title: "Listing not found", robots: { index: false } };
  const image = p.assets.find((a) => a.kind === "photo")?.url ?? DEFAULT_IMAGE;
  const title = `${p.name} · ${p.neighbourhood}, Nairobi`;
  return {
    title, description: p.summary,
    alternates: { canonical: `/properties/${p.slug}` },
    robots: p.status === "published" ? undefined : { index: false, follow: false },
    openGraph: { type: "website", title, description: p.summary, url: `/properties/${p.slug}`, images: [{ url: image, width: 1600, height: 1000, alt: p.name }] },
    twitter: { card: "summary_large_image", title, description: p.summary, images: [image] },
  };
}

export default async function PropertyPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const stay = parseSearch(await searchParams);
  const p = await getProperty(slug);
  if (!p) notFound();
  const today = todayNairobi();
  const user = await getCurrentUser();
  const collections = user ? await myCollections() : [];
  const unit = mainUnit(p);
  const unavailable = Object.fromEntries(await Promise.all(p.units.map(async (u) => [u.id, await getUnavailable(u.id, today, addDays(today, 70)).catch(() => [])] as const)));
  const spaces = unitSpaces(p, unit.id);
  const q = stayQuery(stay);
  const amenitiesFor = p.amenity_details.filter((a) => a.unit_id === unit.id);
  const closest = Object.entries(p.nearby.reduce<Record<string, (typeof p.nearby)[number]>>((acc, n) => { if (!acc[n.category] || acc[n.category].distance_m > n.distance_m) acc[n.category] = n; return acc; }, {}));

  return (
    <div className="container-page py-8">
      {p.status === "published" && <JsonLd data={listingJsonLd(p)} />}
      {p.status !== "published" && <p className="mb-4 rounded-xl bg-champagne/20 px-4 py-2 text-sm text-forest-700">Preview: this listing is <strong>{p.status.replace("_", " ")}</strong> and not visible to guests.</p>}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted"><Link href={`/search${q}`} className="hover:underline">Stays</Link> / <Link href={`/search?neighbourhood=${p.neighbourhood_slug}`} className="hover:underline">{p.neighbourhood}</Link></nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-forest sm:text-4xl">{p.name}</h1>
          <p className="mt-1 text-muted">{TYPE_LABELS[p.property_type]} in {p.neighbourhood}, Nairobi · Unit {unit.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <CompareToggle slug={p.slug} name={p.name} />
          <SaveButton slug={p.slug} signedIn={!!user} collections={collections} />
        </div>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-10">
          <div>
            <Explore rooms={tourRooms(p.assets)} spaces={spaces} photos={p.assets} dimensionSource={dimensionSource(p, unit.id)} />
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href={`/properties/${p.slug}/explore${q}`} className="font-semibold text-forest underline">Open full-screen 360° tour</Link>
              <Link href={`/properties/${p.slug}/explore${stayQuery(stay, { mode: "plan" })}`} className="font-semibold text-forest underline">Floor plan</Link>
              <Link href={`/properties/${p.slug}/around${q}`} className="font-semibold text-forest underline">Around the neighbourhood</Link>
            </div>
          </div>

          <section aria-labelledby="about">
            <h2 id="about" className="font-display text-2xl font-semibold text-forest">About this stay</h2>
            <p className="mt-3 whitespace-pre-line text-ink/90">{p.description}</p>
          </section>

          <section aria-labelledby="units">
            <h2 id="units" className="font-display text-2xl font-semibold text-forest">Units</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {p.units.map((u) => (
                <div key={u.id} className="card p-4">
                  <p className="text-xs font-semibold text-champagne-600">{u.code}</p>
                  <p className="font-display font-semibold text-forest">{u.name}</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted">
                    <li>Up to {u.max_guests} guests</li>
                    {u.bedrooms != null && <li>{u.bedrooms === 0 ? "Studio (no separate bedroom)" : `${u.bedrooms} bedroom${u.bedrooms > 1 ? "s" : ""}`} · {u.bathrooms} bathroom{Number(u.bathrooms) === 1 ? "" : "s"}</li>}
                    {u.sleeping.map((s, i) => <li key={i}>{s.room}: {s.beds}</li>)}
                    <li>Floor area: {u.floor_area_m2 ? <>{u.floor_area_m2} m²{!p.is_demo && <span className="text-xs"> ({u.floor_area_verified ? "verified" : "owner-provided"})</span>}</> : "Unknown"}</li>
                    <li>{kes(u.nightly_rate)} / night · min {u.min_nights} night{u.min_nights > 1 ? "s" : ""}</li>
                  </ul>
                  <p className="mt-2 text-xs text-muted">Booked as one complete unit. Rooms inside a unit can&apos;t be booked separately.</p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="amenities">
            <h2 id="amenities" className="font-display text-2xl font-semibold text-forest">Amenities</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2" data-testid="amenities">
              {amenitiesFor.map((a) => (
                <li key={a.code} className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2 text-sm">
                  <span className={a.value === "no" ? "text-muted line-through" : ""}>{a.label}</span>
                  <span className={`text-xs font-semibold ${a.value === "yes" ? "text-forest" : a.value === "no" ? "text-muted" : "text-champagne-600"}`}>
                    {a.value === "yes" ? "Yes" : a.value === "no" ? "No" : "Unknown"}{a.value !== "unknown" ? ` · ${a.info_source === "verified" ? "verified" : "owner"}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="availability-h">
            <h2 id="availability-h" className="font-display text-2xl font-semibold text-forest">Availability</h2>
            <div className="mt-4"><AvailabilityCalendar today={today} unavailable={unavailable[unit.id] ?? []} /></div>
          </section>

          <section aria-labelledby="around-h">
            <div className="flex items-end justify-between">
              <h2 id="around-h" className="font-display text-2xl font-semibold text-forest">Around {p.neighbourhood}</h2>
              <Link href={`/properties/${p.slug}/around${q}`} className="text-sm font-semibold text-forest underline">Open map</Link>
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {closest.map(([cat, n]) => (
                <li key={cat} className="flex justify-between rounded-xl border border-line bg-white px-3 py-2 text-sm">
                  <span><span className="text-muted">{CATEGORY_LABELS[cat]}:</span> {n.name}</span><span className="font-semibold text-forest">{formatDistance(n.distance_m)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Nearest mapped place per category, straight-line from {p.anchor_is_exact ? "the property" : "a central point in the neighbourhood"}. © OpenStreetMap contributors.</p>
          </section>

          <section aria-labelledby="trust" className="card p-6">
            <h2 id="trust" className="font-display text-2xl font-semibold text-forest">Housio TrueView</h2>
            <p className="mt-1 text-sm text-muted">What we know, and where it comes from.</p>
            <ul className="mt-4 space-y-2 text-sm" data-testid="trueview">
              {p.verification.filter((v) => !["demo", "illustrative"].includes(v.status)).map((v, i) => (
                <li key={i} className="flex gap-3"><span className="w-28 shrink-0 font-semibold capitalize text-forest">{v.field.replace("_", " ")}</span><span><span className="font-semibold">{v.status.replace("_", " ")}</span> · {v.notes}</span></li>
              ))}
              <li className="flex gap-3"><span className="w-28 shrink-0 font-semibold text-forest">Owner</span><span>{p.owner?.name} · {p.owner?.verification_status === "verified" ? "identity verified" : "not verified"}</span></li>
              <li className="flex gap-3"><span className="w-28 shrink-0 font-semibold text-forest">Location</span><span>{p.anchor_note}</span></li>
            </ul>
          </section>

          <section aria-labelledby="reviews">
            <h2 id="reviews" className="font-display text-2xl font-semibold text-forest">Reviews</h2>
            {p.reviews.length === 0 ? <p className="mt-2 text-sm text-muted">No reviews yet. Only guests with a completed stay can leave one.</p> : (
              <ul className="mt-4 space-y-3">{p.reviews.map((r) => (
                <li key={r.id} className="card p-4"><p className="text-sm font-semibold text-forest">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span> · {r.author} · {formatDate(r.created_at)}</p><p className="mt-1 text-sm">{r.body}</p></li>
              ))}</ul>
            )}
          </section>

          <section aria-labelledby="rules"><h2 id="rules" className="font-display text-2xl font-semibold text-forest">House rules</h2><p className="mt-2 text-sm text-ink/90">{p.house_rules || "None specified."}</p></section>

        </div>
        <BookingPanel units={p.units} checkin={stay.checkin} checkout={stay.checkout} guests={stay.guests} today={today} policy={p.cancellation_policy}
          isDemo={p.is_demo} back={`/properties/${p.slug}${q}`} unavailable={unavailable} />
      </div>
      <CompareBar query={q} />
    </div>
  );
}
