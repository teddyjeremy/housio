import { getNeighbourhoods } from "@/lib/db/queries";
import { TYPE_LABELS, todayNairobi } from "@/lib/format";
import type { SearchParams } from "@/lib/search-params";

export async function SearchBar({ values = {}, compact = false }: { values?: SearchParams; compact?: boolean }) {
  const hoods = await getNeighbourhoods().catch(() => []);
  const today = todayNairobi();
  return (
    <form action="/search" method="get" role="search" aria-label="Search stays"
      className={`grid gap-3 rounded-3xl border border-line bg-white p-3 shadow-sm ${compact ? "md:grid-cols-[1.3fr_1fr_1fr_0.7fr_auto]" : "md:grid-cols-[1.4fr_1fr_1fr_0.7fr_auto]"}`}>
      <label className="block px-2">
        <span className="label">Where</span>
        <select name="neighbourhood" defaultValue={values.neighbourhood ?? ""} className="input border-0 px-0 focus:ring-0">
          <option value="">All Nairobi neighbourhoods</option>
          {hoods.map((h) => <option key={h.slug} value={h.slug}>{h.name}</option>)}
        </select>
      </label>
      <label className="block px-2"><span className="label">Check in</span><input type="date" name="checkin" min={today} defaultValue={values.checkin} className="input border-0 px-0 focus:ring-0" /></label>
      <label className="block px-2"><span className="label">Check out</span><input type="date" name="checkout" min={today} defaultValue={values.checkout} className="input border-0 px-0 focus:ring-0" /></label>
      <label className="block px-2"><span className="label">Guests</span><input type="number" name="guests" min={1} max={30} defaultValue={values.guests ?? 2} className="input border-0 px-0 focus:ring-0" /></label>
      <button className="btn btn-primary self-center px-7 py-3">Search</button>
      {!compact && (
        <details className="px-2 md:col-span-5">
          <summary className="cursor-pointer text-xs font-semibold text-forest">More filters</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <label><span className="label">Type</span>
              <select name="type" defaultValue={values.type ?? ""} className="input"><option value="">Any</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label><span className="label">Stay</span>
              <select name="stay" defaultValue={values.stay ?? ""} className="input"><option value="">Any</option><option value="short">Short stays</option><option value="long">Long stays (28+ nights)</option></select></label>
            <label><span className="label">Min / night (KES)</span><input name="min_price" type="number" min={0} defaultValue={values.min_price} className="input" /></label>
            <label><span className="label">Max / night (KES)</span><input name="max_price" type="number" min={0} defaultValue={values.max_price} className="input" /></label>
          </div>
        </details>
      )}
    </form>
  );
}
