import type { Metadata } from "next";
import { SearchBar } from "@/components/listing/SearchBar";
import { PropertyCard } from "@/components/listing/PropertyCard";
import { CompareBar } from "@/components/listing/CompareTray";
import { Empty } from "@/components/ui/ui";
import { getAmenities, searchProperties } from "@/lib/db/queries";
import { parseSearch, stayQuery, toQuery } from "@/lib/search-params";

export const metadata: Metadata = { title: "Search stays" };
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseSearch(await searchParams);
  let error = false;
  const [results, amenities] = await Promise.all([
    searchProperties(params).catch(() => { error = true; return []; }),
    getAmenities().catch(() => []),
  ]);
  const amen = new Set(params.amenities ?? []);
  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-bold text-forest">Stays in Nairobi</h1>
      <div className="mt-6"><SearchBar values={params} compact /></div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <form action="/search" method="get" className="space-y-4" aria-label="Amenity filters">
          {Object.entries(params).filter(([k]) => k !== "amenities").map(([k, v]) => <input key={k} type="hidden" name={k} value={String(v)} />)}
          <fieldset>
            <legend className="label">Amenities</legend>
            <div className="space-y-1.5">
              {amenities.map((a) => (
                <label key={a.code} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="amenities" value={a.code} defaultChecked={amen.has(a.code)} className="accent-forest" /> {a.label}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="btn btn-secondary w-full">Apply filters</button>
          <p className="text-xs text-muted">Filters match amenities owners marked as available. Unknown values don&apos;t match.</p>
        </form>
        <div>
          <p className="mb-4 text-sm text-muted" aria-live="polite" data-testid="result-count">{results.length} stay{results.length === 1 ? "" : "s"} found{params.checkin && params.checkout ? ` · prices for ${params.checkin} to ${params.checkout}` : ""}</p>
          {error ? <Empty title="Search is unavailable right now">Please try again in a moment.</Empty>
            : results.length === 0 ? <Empty title="No stays match" href="/search" cta="Clear filters">Try fewer filters or other dates.</Empty>
            : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.map((p) => <PropertyCard key={p.id} p={p} stay={params} />)}</div>}
        </div>
      </div>
      <CompareBar query={stayQuery(params)} />
      <span hidden data-query={toQuery(params)} />
    </div>
  );
}
