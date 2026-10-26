import manifest from "@/data/asset-manifest.json";
import pois from "@/data/pois.json";
import { Prose } from "@/components/ui/Prose";
export const metadata = { title: "Data and asset licences" };

export default function Page() {
  return (
    <Prose title="Data and asset licences">
      <h2>Places and maps</h2>
      <p>Nearby places are from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, © OpenStreetMap contributors, available under the Open Database Licence (ODbL 1.0). Extracted from the Geofabrik Kenya extract on {pois.retrieved_at.slice(0, 10)}. Each place links to its OpenStreetMap record.</p>
      <p>Map tiles by <a href="https://openfreemap.org">OpenFreeMap</a>, built from OpenStreetMap data.</p>
      <h2>3D models, textures and lighting</h2>
      <p>All {manifest.assets.length} assets are CC0 (public domain). Credit is not required but is given gladly.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm" data-testid="asset-table">
        <thead><tr className="text-left text-muted"><th className="p-2">Asset</th><th className="p-2">Source</th><th className="p-2">Creator</th><th className="p-2">Licence</th><th className="p-2">Size</th></tr></thead>
        <tbody>{manifest.assets.map((a) => (
          <tr key={a.id} className="border-t border-line"><td className="p-2">{a.name} <span className="text-muted">({a.category})</span></td><td className="p-2"><a href={a.page_url}>{a.source}</a></td><td className="p-2">{a.creator}</td><td className="p-2">{a.licence}</td><td className="p-2">{Math.round(a.bytes / 1024)} KB</td></tr>
        ))}</tbody></table></div>
      <h2>Fonts</h2><p>Manrope and Inter, SIL Open Font Licence, via Google Fonts.</p>
    </Prose>
  );
}
