"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveProperty } from "@/app/actions/owner";
import { propertySchema, PROPERTY_TYPES, UNIT_TYPES, type PropertyInput } from "@/lib/validation";
import { TYPE_LABELS } from "@/lib/format";

interface Props { id: string | null; initial: PropertyInput; neighbourhoods: { slug: string; name: string }[]; amenities: { code: string; label: string }[]; locked?: boolean }

export function PropertyForm({ id, initial, neighbourhoods, amenities, locked }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<PropertyInput>({ resolver: zodResolver(propertySchema), defaultValues: initial });
  const onSubmit = handleSubmit((data) => start(async () => {
    const r = await saveProperty(id, data);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: "Saved." });
    if (!id) router.push(`/owner/properties/${r.data.id}`);
    else router.refresh();
  }));
  const err = (k: keyof PropertyInput) => errors[k] && <span role="alert" className="mt-1 block text-xs text-red-700">{String(errors[k]?.message)}</span>;
  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate data-testid="property-form">
      {locked && <p className="rounded-xl bg-champagne/20 p-3 text-sm">This is a protected demo listing, so its details are read-only. Availability and prices below can still be managed, or create a new draft listing.</p>}
      <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="label">Listing name</span><input className="input" {...register("name")} />{err("name")}</label>
        <label><span className="label">Property type</span><select className="input" {...register("property_type")}>{PROPERTY_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></label>
        <label><span className="label">Bookable unit type</span><select className="input" {...register("unit_type")}>{UNIT_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select></label>
        <label><span className="label">Neighbourhood</span><select className="input" {...register("neighbourhood")}><option value="">Choose…</option>{neighbourhoods.map((n) => <option key={n.slug} value={n.slug}>{n.name}</option>)}</select>{err("neighbourhood")}</label>
        <label><span className="label">Cancellation policy</span><select className="input" {...register("cancellation_policy")}><option value="flexible">Flexible</option><option value="moderate">Moderate</option><option value="strict">Strict</option></select></label>
        <label className="sm:col-span-2"><span className="label">Summary</span><input className="input" {...register("summary")} />{err("summary")}</label>
        <label className="sm:col-span-2"><span className="label">Description</span><textarea rows={5} className="input" {...register("description")} /></label>
        <label className="sm:col-span-2"><span className="label">House rules</span><textarea rows={2} className="input" {...register("house_rules")} /></label>
        <div className="flex gap-4 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-forest" {...register("stay_short")} /> Short stays</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-forest" {...register("stay_long")} /> Long stays (28+ nights)</label>
          {err("stay_short")}
        </div>
      </fieldset>
      <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-4">
        <legend className="mb-2 font-display text-lg font-semibold text-forest">Capacity, size and pricing</legend>
        <label><span className="label">Max guests</span><input type="number" className="input" {...register("max_guests")} /></label>
        <label><span className="label">Bedrooms</span><input type="number" className="input" {...register("bedrooms")} /></label>
        <label><span className="label">Bathrooms</span><input type="number" step="0.5" className="input" {...register("bathrooms")} /></label>
        <label><span className="label">Floor area m²</span><input type="number" className="input" {...register("floor_area_m2")} /></label>
        <label><span className="label">Nightly (KES)</span><input type="number" className="input" {...register("nightly_rate")} />{err("nightly_rate")}</label>
        <label><span className="label">Weekly discount %</span><input type="number" className="input" {...register("weekly_discount_pct")} /></label>
        <label><span className="label">Monthly discount %</span><input type="number" className="input" {...register("monthly_discount_pct")} /></label>
        <label><span className="label">Min nights</span><input type="number" className="input" {...register("min_nights")} /></label>
        <label><span className="label">Cleaning fee</span><input type="number" className="input" {...register("cleaning_fee")} /></label>
        <label><span className="label">Deposit</span><input type="number" className="input" {...register("deposit")} /></label>
        <p className="self-end text-xs text-muted sm:col-span-2">Measurements you enter are shown as owner-provided until Housio verifies them.</p>
      </fieldset>
      <fieldset disabled={locked}>
        <legend className="mb-2 font-display text-lg font-semibold text-forest">Amenities</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {amenities.map((a) => (
            <label key={a.code} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-1.5 text-sm">{a.label}
              <select className="rounded-lg border border-line px-1 py-0.5 text-xs" {...register(`amenities.${a.code}` as const)}><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select>
            </label>
          ))}
        </div>
      </fieldset>
      {!locked && <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : id ? "Save changes" : "Create draft"}</button>}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-forest" : "text-red-700"}`}>{msg.text}</p>}
    </form>
  );
}
