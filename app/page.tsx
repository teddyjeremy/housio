import Image from "next/image";
import Link from "next/link";
import { SearchBar } from "@/components/listing/SearchBar";
import { PropertyCard } from "@/components/listing/PropertyCard";
import { CompareBar } from "@/components/listing/CompareTray";
import { DemoLogins } from "@/components/DemoLogins";
import { TrustBadge } from "@/components/ui/ui";
import { searchProperties } from "@/lib/db/queries";
import { SITE_TAGLINE } from "@/lib/site";

export const dynamic = "force-dynamic";

const FEATURES = [
  { name: "Explore", title: "Walk through in 3D", body: "Orbit, zoom and move room to room. Tap furniture to see what it is. Illustrative interiors are always labelled." },
  { name: "SpaceMap", title: "Floor plans that connect", body: "Pick a room on the plan and jump straight to it in 3D. Measurements appear only when they are supplied or verified." },
  { name: "Around", title: "Know the neighbourhood", body: "Real cafés, clinics, pharmacies, shops and transport from OpenStreetMap, with straight-line distances and sources." },
  { name: "Compare", title: "Side by side", body: "Up to three stays with total price for your dates, availability, space, amenities and cancellation terms." },
  { name: "Fit", title: "Matched to how you live", body: "Tell us what matters, from a desk to step-free access. Rankings use listing data only, and unknowns stay unknown." },
  { name: "TrueView", title: "Labels you can trust", body: "Owner photos, verified models, illustrative renders and owner-provided facts are clearly marked." },
];

export default async function Home() {
  const listings = await searchProperties({}).catch(() => []);
  const hero = listings.find((l) => l.slug === "kilimani-family-apartment") ?? listings[0];
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div className="fade-up">
            <p className="eyebrow">Stays in Nairobi, in three dimensions</p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] text-forest sm:text-6xl">{SITE_TAGLINE}</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">Find serviced apartments, studios and homes, then step inside before you book. Every listing pairs a clear price with an interactive tour, a floor plan and the neighbourhood around it.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/search" className="btn btn-primary px-6 py-3">Browse stays</Link>
              {hero && <Link href={`/properties/${hero.slug}/explore`} className="btn btn-secondary px-6 py-3">Step inside a demo home</Link>}
            </div>
          </div>
          {hero?.cover && (
            <Link href={`/properties/${hero.slug}/explore`} className="group relative block aspect-[5/4] overflow-hidden rounded-[2rem] border border-line bg-sage/50 shadow-xl">
              <Image src={hero.cover.url} alt="Illustrative 3D interior of a demonstration apartment" fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover transition duration-700 group-hover:scale-[1.02]" />
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3 backdrop-blur">
                <div><p className="text-xs text-muted">{hero.neighbourhood}</p><p className="font-display font-semibold text-forest">{hero.name}</p></div>
                <TrustBadge kind="illustrative_render" />
              </div>
            </Link>
          )}
        </div>
        <div className="container-page -mt-2 pb-6"><SearchBar /></div>
      </section>

      <section className="container-page py-14" aria-labelledby="features">
        <h2 id="features" className="font-display text-3xl font-bold text-forest">More than photos</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.name} className="card p-6">
              <p className="eyebrow">Housio {f.name}</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-forest">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-6" aria-labelledby="featured">
        <div className="flex items-end justify-between">
          <div>
            <h2 id="featured" className="font-display text-3xl font-bold text-forest">Nairobi demo collection</h2>
            <p className="mt-1 text-sm text-muted">Ten fictional demonstration listings across eight neighbourhoods, with illustrative interiors and real nearby places.</p>
          </div>
          <Link href="/search" className="btn btn-secondary hidden sm:inline-flex">See all</Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.slice(0, 6).map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="container-page py-14"><DemoLogins /></section>
      <section className="container-page pb-6">
        <div className="card flex flex-col items-start justify-between gap-4 bg-forest p-8 text-ivory sm:flex-row sm:items-center">
          <div><h2 className="font-display text-2xl font-bold">Own a serviced apartment or home?</h2><p className="mt-1 text-ivory/70">Owner Studio lets you list units, upload photos, floor plans and 3D models, and manage availability.</p></div>
          <Link href="/register?role=owner" className="btn btn-gold">List with Housio</Link>
        </div>
      </section>
      <CompareBar />
    </>
  );
}
