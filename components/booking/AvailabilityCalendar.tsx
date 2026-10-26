import { addDays } from "@/lib/pricing";

/** Two-month availability grid. Dates come from the server and reveal nothing about who booked. */
export function AvailabilityCalendar({ today, unavailable, months = 2 }: { today: string; unavailable: string[]; months?: number }) {
  const blocked = new Set(unavailable);
  const start = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  const blocks = Array.from({ length: months }, (_, i) => {
    const m = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const first = m.toISOString().slice(0, 10);
    const daysIn = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0)).getUTCDate();
    const lead = (m.getUTCDay() + 6) % 7;
    return { label: m.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }), first, daysIn, lead };
  });
  return (
    <div className="grid gap-6 sm:grid-cols-2" data-testid="availability">
      {blocks.map((b) => (
        <div key={b.first}>
          <p className="mb-2 font-display text-sm font-semibold text-forest">{b.label}</p>
          <div className="grid grid-cols-7 gap-1 text-center text-xs" role="grid" aria-label={b.label}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="text-muted" aria-hidden>{d}</span>)}
            {Array.from({ length: b.lead }, (_, i) => <span key={`l${i}`} />)}
            {Array.from({ length: b.daysIn }, (_, i) => {
              const d = addDays(b.first, i);
              const past = d < today;
              const taken = blocked.has(d);
              return (
                <span key={d} role="gridcell" aria-label={`${d}: ${past ? "past" : taken ? "unavailable" : "available"}`}
                  className={`rounded-md py-1.5 ${past ? "text-muted/40" : taken ? "bg-ink/10 text-muted line-through" : "bg-sage/60 text-forest"}`}>{i + 1}</span>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted sm:col-span-2"><span className="mr-1 inline-block h-3 w-3 rounded bg-sage/60 align-middle" /> Available <span className="ml-3 mr-1 inline-block h-3 w-3 rounded bg-ink/10 align-middle" /> Booked or blocked</p>
    </div>
  );
}
