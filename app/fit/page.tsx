import type { Metadata } from "next";
import Link from "next/link";
import { searchProperties } from "@/lib/db/queries";
import { CRITERIA, rankFit } from "@/lib/fit";
import { kes } from "@/lib/format";
import { parseSearch, stayQuery } from "@/lib/search-params";

export const metadata: Metadata = { title: "Housio Fit" };
export const dynamic = "force-dynamic";

export default async function FitPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const stay = parseSearch(sp);
  const raw = sp.want;
  const want = (Array.isArray(raw) ? raw : raw ? String(raw).split(",") : []).filter((k) => k in CRITERIA);
  const all = await searchProperties({ guests: stay.guests, checkin: stay.checkin, checkout: stay.checkout }).catch(() => []);
  const results = want.length ? rankFit(all, want, stay.guests ?? 1) : [];
  return (
    <div className="container-page py-10">
      <p className="eyebrow">Housio Fit</p>
      <h1 className="font-display text-3xl font-bold text-forest">Find the stay that fits how you live</h1>
      <p className="mt-2 max-w-2xl text-muted">Choose what matters. We rank stays using only what each listing states. Anything a listing doesn&apos;t state is shown as unknown and never counted as a match.</p>
      <form className="card mt-6 p-5" action="/fit">
        <fieldset>
          <legend className="label">What do you need?</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(CRITERIA).map((c) => (
              <label key={c.key} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <input type="checkbox" name="want" value={c.key} defaultChecked={want.includes(c.key)} className="accent-forest" />{c.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label><span className="label">Guests</span><input type="number" min={1} max={30} name="guests" defaultValue={stay.guests ?? 2} className="input w-24" /></label>
          <button className="btn btn-primary">Rank stays</button>
        </div>
      </form>
      {want.length > 0 && (
        <ol className="mt-8 space-y-4" data-testid="fit-results">
          {results.map((r, i) => (
            <li key={r.property.slug} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-champagne-600">#{i + 1} · {r.property.neighbourhood}</p>
                  <Link href={`/properties/${r.property.slug}${stayQuery(stay)}`} className="font-display text-xl font-semibold text-forest hover:underline">{r.property.name}</Link>
                  <p className="text-sm text-muted">{kes(r.unit.nightly_rate)} / night · up to {r.unit.max_guests} guests</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-forest" data-testid="fit-score">{r.score}/{r.max}</p>
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {r.details.map((d) => (
                  <li key={d.key} title={d.explain} className={`chip ${d.verdict === "match" ? "!border-forest !bg-sage" : d.verdict === "no" ? "opacity-60" : "!border-champagne"}`}>
                    {d.verdict === "match" ? "✓" : d.verdict === "no" ? "✕" : "?"} {d.label}{d.verdict === "unknown" ? " (unknown)" : ""}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-6 text-xs text-muted">Scoring: each chosen need has a weight (2–3 for core needs, 1 for nice-to-haves). Proximity uses straight-line distances to OpenStreetMap places.</p>
    </div>
  );
}
