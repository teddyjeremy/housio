"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { blockDates, deleteAsset, deleteProperty, saveSpace, setRate, submitForReview, uploadAsset } from "@/app/actions/owner";
import { formatDate, kes } from "@/lib/format";
import type { Asset, Space } from "@/types";

function useAct() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, ok = "Saved.") => start(async () => {
    const r = await fn();
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: (r as { error: string }).error });
    if (r.ok) router.refresh();
  });
  const note = msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-forest" : "text-red-700"}`}>{msg.text}</p>;
  return { act, pending, note };
}

export function AvailabilityTools({ units, blocks, rates }: { units: { id: string; name: string }[]; blocks: { id: string; unit_id: string; from: string; to: string }[]; rates: { id: string; unit_id: string; from: string; to: string; nightly_rate: number }[] }) {
  const { act, pending, note } = useAct();
  const [unit, setUnit] = useState(units[0]?.id ?? "");
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [rate, setRateV] = useState("");
  return (
    <div className="space-y-4" data-testid="availability-tools">
      <div className="flex flex-wrap items-end gap-2">
        {units.length > 1 && <label><span className="label">Unit</span><select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>}
        <label><span className="label">From</span><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Block from" /></label>
        <label><span className="label">To (exclusive)</span><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Block to" /></label>
        <button className="btn btn-secondary" disabled={pending} onClick={() => act(() => blockDates(unit, from, to, null), "Dates blocked.")}>Block dates</button>
        <label><span className="label">Nightly (KES)</span><input type="number" className="input w-32" value={rate} onChange={(e) => setRateV(e.target.value)} /></label>
        <button className="btn btn-secondary" disabled={pending} onClick={() => act(() => setRate(unit, from, to, Number(rate), null), "Seasonal price saved.")}>Set price for dates</button>
      </div>
      {note}
      <ul className="space-y-1 text-sm">
        {blocks.filter((b) => b.unit_id === unit).map((b) => <li key={b.id} className="flex items-center gap-3">Blocked {formatDate(b.from)} → {formatDate(b.to)} <button className="text-xs underline" onClick={() => act(() => blockDates(unit, null, null, b.id), "Block removed.")}>Remove</button></li>)}
        {rates.filter((r) => r.unit_id === unit).map((r) => <li key={r.id} className="flex items-center gap-3">{kes(r.nightly_rate)} / night {formatDate(r.from)} → {formatDate(r.to)} <button className="text-xs underline" onClick={() => act(() => setRate(unit, null, null, null, r.id), "Price removed.")}>Remove</button></li>)}
      </ul>
    </div>
  );
}

export function SpacesEditor({ unitId, spaces, locked }: { unitId: string; spaces: Space[]; locked: boolean }) {
  const { act, pending, note } = useAct();
  const [s, setS] = useState({ name: "", kind: "living", x: "0", z: "0", width: "4", depth: "3.5" });
  return (
    <div>
      <ul className="space-y-1 text-sm">
        {spaces.map((sp) => <li key={sp.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-1.5"><span>{sp.name} <span className="text-muted">({sp.kind}, {Number(sp.width)} × {Number(sp.depth)} m at {Number(sp.x)},{Number(sp.z)})</span></span>
          {!locked && <button className="text-xs underline" onClick={() => act(() => saveSpace(unitId, sp.id, null, true), "Room removed.")}>Remove</button>}</li>)}
      </ul>
      {!locked && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-7">
          <input aria-label="Room name" placeholder="Room name" className="input sm:col-span-2" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
          <select aria-label="Room type" className="input" value={s.kind} onChange={(e) => setS({ ...s, kind: e.target.value })}>{["living", "bedroom", "kitchen", "bathroom", "dining", "balcony", "office", "garden", "meeting"].map((k) => <option key={k}>{k}</option>)}</select>
          {(["x", "z", "width", "depth"] as const).map((k) => <input key={k} aria-label={k} placeholder={k} type="number" step="0.1" className="input" value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} />)}
          <button className="btn btn-secondary sm:col-span-7" disabled={pending} onClick={() => act(() => saveSpace(unitId, null, s), "Room added.")}>Add room to floor plan</button>
        </div>
      )}
      {note}
    </div>
  );
}

export function UploadForm({ propertyId, assets, locked }: { propertyId: string; assets: Asset[]; locked: boolean }) {
  const { act, pending, note } = useAct();
  return (
    <div>
      <ul className="mb-3 grid gap-2 sm:grid-cols-2 text-sm">
        {assets.map((a) => <li key={a.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-1.5"><span>{a.kind.replace("_", " ")} · {a.trust_label.replace("_", " ")}{a.caption ? ` · ${a.caption.slice(0, 40)}` : ""}</span>
          {a.source === "owner" && <button className="text-xs underline" onClick={() => act(() => deleteAsset(a.id), "Removed.")}>Remove</button>}</li>)}
      </ul>
      {!locked && (
        <form className="grid gap-2 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); act(() => uploadAsset(fd), "Uploaded."); }}>
          <input type="hidden" name="property" value={propertyId} />
          <select name="kind" className="input" aria-label="File type"><option value="photo">Photograph</option><option value="floor_plan">Floor plan image</option><option value="model">3D model (GLB)</option></select>
          <input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.glb" className="input" aria-label="File" required />
          <input name="caption" placeholder="Caption" className="input" aria-label="Caption" />
          <button className="btn btn-secondary" disabled={pending}>Upload</button>
          <label className="flex items-center gap-2 text-xs text-muted sm:col-span-4"><input type="checkbox" name="exact" className="accent-forest" /> This 3D model is an accurate model of this specific unit (shown as illustrative until Housio verifies it).</label>
        </form>
      )}
      <p className="mt-1 text-xs text-muted">JPEG, PNG, WebP or GLB, up to 4 MB each.</p>
      {note}
    </div>
  );
}

export function ListingActions({ id, status, isSeed }: { id: string; status: string; isSeed: boolean }) {
  const { act, pending, note } = useAct();
  const router = useRouter();
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(status === "draft" || status === "rejected") && <button className="btn btn-gold" disabled={pending} onClick={() => act(() => submitForReview(id), "Submitted for review.")} data-testid="submit-review">Submit for review</button>}
        {!isSeed && <button className="btn btn-ghost text-red-700" disabled={pending} onClick={() => { if (confirm("Delete this listing?")) act(async () => { const r = await deleteProperty(id); if (r.ok) router.push("/owner"); return r; }, "Deleted."); }}>Delete listing</button>}
      </div>
      {note}
    </div>
  );
}
