import panos from "@/data/panoramas.json";
import pois from "@/data/pois.json";
import { Prose } from "@/components/ui/Prose";
export const metadata = { title: "Credits and licences", alternates: { canonical: "/licences" } };

export default function Page() {
  return (
    <Prose title="Credits and licences">
      <h2>Places and maps</h2>
      <p>Nearby places are from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, © OpenStreetMap contributors, available under the Open Database Licence (ODbL 1.0). Extracted from the Geofabrik Kenya extract on {pois.retrieved_at.slice(0, 10)}. Each place links to its OpenStreetMap record.</p>
      <p>Map tiles by <a href="https://openfreemap.org">OpenFreeMap</a>, built from OpenStreetMap data.</p>
      <h2>Room panoramas and photos</h2>
      <p>Room panoramas, and the listing photos cropped from them, come from <a href="https://polyhaven.com">Poly Haven</a> (CC0) and <a href="https://commons.wikimedia.org">Wikimedia Commons</a> (public domain, CC BY 2.0, CC BY 4.0 or CC BY-SA 4.0). They were resized and cropped for this site. Each is credited below with a link to its source and licence.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm" data-testid="asset-table">
        <thead><tr className="text-left text-muted"><th className="p-2">Panorama</th><th className="p-2">Source</th><th className="p-2">Photographer</th><th className="p-2">Licence</th><th className="p-2">Size</th></tr></thead>
        <tbody>{panos.panoramas.map((a) => (
          <tr key={a.id} className="border-t border-line"><td className="p-2">{a.name} <span className="text-muted">({a.kind})</span></td><td className="p-2"><a href={a.page_url}>{a.source}</a></td><td className="p-2">{a.creator}</td><td className="p-2"><a href={a.licence_url}>{a.licence}</a></td><td className="p-2">{Math.round(a.bytes / 1024)} KB</td></tr>
        ))}</tbody></table></div>
      <h2>Fonts</h2><p>Manrope and Inter, SIL Open Font Licence, via Google Fonts.</p>
    </Prose>
  );
}
