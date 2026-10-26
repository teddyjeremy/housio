import type { Metadata } from "next";
import Link from "next/link";
import { Explore } from "@/components/explore/Explore";
import { CompareHint } from "@/components/listing/CompareHint";
import { TrustBadge, Empty } from "@/components/ui/ui";
import { compareProperties } from "@/lib/db/queries";
import { parseSearch, stayQuery } from "@/lib/search-params";
import { kes, TYPE_LABELS } from "@/lib/format";
import { POLICY_TEXT } from "@/lib/cancellation";
import { CATEGORY_LABELS, formatDistance } from "@/lib/geo";
import { dimensionSource, mainUnit, modelTrust, unitSpaces } from "@/lib/listing";

export const metadata: Metadata = { title: "Compare stays" };
export const dynamic = "force-dynamic";

export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const stay = parseSearch(sp);
  const ids = (typeof sp.ids === "string" ? sp.ids.split(",") : []).filter((s) => /^[a-z0-9-]{3,80}$/.test(s)).slice(0, 3);
  const items = ids.length ? await compareProperties(ids, stay.checkin, stay.checkout, stay.guests).catch(() => []) : [];
  const q = stayQuery(stay);
  const view3d = sp.view === "3d";
  if (!items.length) {
    return (
      <div className="container-page py-10">
        <h1 className="font-display text-3xl font-bold text-forest">Housio Compare</h1>
        <div className="mt-6"><Empty title="Pick up to three stays to compare" href={`/search${q}`} cta="Browse stays">Use “+ Compare” on any listing.</Empty></div>
        <CompareHint query={q} />
      </div>
    );
  }
  const amenityCodes = [...new Set(items.flatMap((p) => p.amenity_details.map((a) => a.code)))];
  const label = (code: string) => items.flatMap((p) => p.amenity_details).find((a) => a.code === code)?.label ?? code;
  const rows: { k: string; v: (p: (typeof items)[number]) => React.ReactNode }[] = [
    { k: "Type", v: (p) => TYPE_LABELS[p.property_type] },
    { k: "Neighbourhood", v: (p) => p.neighbourhood },
    { k: stay.checkin && stay.checkout ? `Total for ${stay.checkin} → ${stay.checkout}` : "Nightly rate", v: (p) => {
      const u = p.card.units.find((x) => x.id === mainUnit(p).id)!;
      if (u.quote) return u.quote.ok ? <span><strong>{kes(u.quote.total)}</strong><br /><span className="text-xs text-muted">{u.quote.nights} nights incl. fees</span></span> : <span className="text-xs text-red-700">{u.quote.error?.replace("_", " ")}</span>;
      return `${kes(u.nightly_rate)} / night`;
    } },
    { k: "Availability", v: (p) => { const u = p.card.units.find((x) => x.id === mainUnit(p).id)!; return u.quote ? (u.quote.ok && u.quote.available ? "✓ Available" : "✕ Not available") : "Choose dates"; } },
    { k: "Guests", v: (p) => `Up to ${mainUnit(p).max_guests}` },
    { k: "Bedrooms", v: (p) => { const u = mainUnit(p); return u.bedrooms === 0 ? "Studio" : `${u.bedrooms ?? "Unknown"}`; } },
    { k: "Beds", v: (p) => mainUnit(p).sleeping.map((s) => s.beds).join(", ") || "Unknown" },
    { k: "Bathrooms", v: (p) => `${mainUnit(p).bathrooms ?? "Unknown"}` },
    { k: "Floor area", v: (p) => { const u = mainUnit(p); return u.floor_area_m2 ? `${u.floor_area_m2} m² (${u.floor_area_verified ? "verified" : p.is_demo ? "illustrative" : "owner-provided"})` : "Unknown"; } },
    ...amenityCodes.map((c) => ({ k: label(c), v: (p: (typeof items)[number]) => { const a = p.amenity_details.find((x) => x.code === c && x.unit_id === mainUnit(p).id); return a ? (a.value === "yes" ? "✓" : a.value === "no" ? "✕" : "Unknown") : "Unknown"; } })),
    ...["hospital", "shopping", "restaurant", "transport"].map((c) => ({ k: `Nearest ${CATEGORY_LABELS[c].toLowerCase()}`, v: (p: (typeof items)[number]) => { const n = p.nearby.filter((x) => x.category === c).sort((a, b) => a.distance_m - b.distance_m)[0]; return n ? `${n.name} · ${formatDistance(n.distance_m)}` : "None found nearby"; } })),
    { k: "Cancellation", v: (p) => <span title={POLICY_TEXT[p.cancellation_policy].summary}>{POLICY_TEXT[p.cancellation_policy].title}</span> },
    { k: "Rating", v: (p) => (p.review_count ? `★ ${p.rating} (${p.review_count})` : "No eligible reviews yet") },
  ];
  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">Housio Compare</p><h1 className="font-display text-3xl font-bold text-forest">Side by side</h1></div>
        <form className="flex flex-wrap items-end gap-2" action="/compare">
          <input type="hidden" name="ids" value={ids.join(",")} />
          <label><span className="label">Check in</span><input className="input" type="date" name="checkin" defaultValue={stay.checkin} /></label>
          <label><span className="label">Check out</span><input className="input" type="date" name="checkout" defaultValue={stay.checkout} /></label>
          <label><span className="label">Guests</span><input className="input w-20" type="number" min={1} name="guests" defaultValue={stay.guests ?? 2} /></label>
          <button className="btn btn-primary">Update</button>
        </form>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm" data-testid="compare-table">
          <thead><tr><th className="w-48" />{items.map((p) => (
            <th key={p.slug} scope="col" className="p-3 text-left align-top">
              <Link href={`/properties/${p.slug}${q}`} className="font-display text-lg font-semibold text-forest hover:underline">{p.name}</Link>
              <div className="mt-1 flex flex-wrap gap-1">{p.is_demo && <TrustBadge kind="demo" />}<TrustBadge kind={modelTrust(p)} /></div>
            </th>))}</tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.k} className="odd:bg-white"><th scope="row" className="border-t border-line p-3 text-left font-semibold text-muted">{r.k}</th>
              {items.map((p) => <td key={p.slug} className="border-t border-line p-3 align-top">{r.v(p)}</td>)}</tr>
          ))}</tbody>
        </table>
      </div>
      <div className="mt-10">
        <div className="flex items-center justify-between"><h2 className="font-display text-2xl font-semibold text-forest">Split-screen 3D</h2>
          {!view3d && <Link className="btn btn-secondary" href={`/compare${stayQuery(stay, { ids: ids.join(","), view: "3d" })}`}>Load side-by-side 3D</Link>}</div>
        {view3d ? (
          <div className={`mt-4 grid gap-4 ${items.length > 1 ? "lg:grid-cols-2" : ""}`}>
            {items.slice(0, 2).map((p) => { const u = mainUnit(p); return (
              <div key={p.slug}><p className="mb-2 font-semibold text-forest">{p.name}</p>
                <Explore compact spaces={unitSpaces(p, u.id)} style={u.scene_style} photos={p.assets} modelTrust={modelTrust(p)} dimensionSource={dimensionSource(p, u.id)} autoLoad /></div>
            ); })}
            {items.length > 2 && <p className="text-xs text-muted">Showing the first two stays in 3D to keep things smooth on most devices.</p>}
          </div>
        ) : <p className="mt-2 text-sm text-muted">Loads two interactive tours next to each other. Illustrative interiors are labelled.</p>}
      </div>
    </div>
  );
}
