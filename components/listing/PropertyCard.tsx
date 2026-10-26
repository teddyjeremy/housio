import Image from "next/image";
import Link from "next/link";
import { TrustBadge } from "@/components/ui/ui";
import { kes, TYPE_LABELS } from "@/lib/format";
import { stayQuery, type SearchParams } from "@/lib/search-params";
import { CompareToggle } from "@/components/listing/CompareTray";
import type { PropertyCard as Card } from "@/types";

export function PropertyCard({ p, stay = {} }: { p: Card; stay?: SearchParams }) {
  const unit = p.units.find((u) => u.parent_unit_id === null && u.unit_type !== "meeting_room") ?? p.units[0];
  const q = unit?.quote;
  const href = `/properties/${p.slug}${stayQuery(stay)}`;
  return (
    <article className="group card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg" data-testid="property-card" data-neighbourhood={p.neighbourhood}>
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] bg-sage/50">
          {p.cover && <Image src={p.cover.url} alt={`${p.name}: ${p.cover.caption}`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {p.is_demo && <TrustBadge kind="demo" />}
            {p.cover && <TrustBadge kind={p.cover.trust_label} />}
          </div>
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-champagne-600">{p.neighbourhood} · {TYPE_LABELS[p.property_type]}</p>
            <h3 className="mt-1 font-display text-lg font-semibold text-forest"><Link href={href}>{p.name}</Link></h3>
          </div>
          <CompareToggle slug={p.slug} name={p.name} />
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{p.summary}</p>
        {unit && (
          <p className="mt-2 text-xs text-muted">
            Up to {unit.max_guests} guests · {unit.bedrooms === 0 ? "Studio" : `${unit.bedrooms ?? "?"} bedroom${unit.bedrooms === 1 ? "" : "s"}`} · {unit.bathrooms ?? "?"} bath
          </p>
        )}
        <div className="mt-3 flex items-end justify-between">
          {q?.ok ? (
            <p className="text-sm"><span className="font-display text-lg font-bold text-forest">{kes(q.total)}</span> <span className="text-muted">total · {q.nights} nights</span>
              {!q.available && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">Unavailable</span>}</p>
          ) : (
            <p className="text-sm"><span className="font-display text-lg font-bold text-forest">{kes(unit?.nightly_rate)}</span> <span className="text-muted">/ night</span></p>
          )}
          <p className="text-xs text-muted">{p.review_count ? `★ ${p.rating} (${p.review_count})` : "No reviews yet"}</p>
        </div>
      </div>
    </article>
  );
}
