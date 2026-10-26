import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { searchProperties } from "@/lib/db/queries";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const props = await searchProperties({}).catch(() => []);
  return [
    ...["", "/search", "/fit", "/compare", "/privacy", "/terms", "/cancellation", "/support", "/licences"].map((p) => ({ url: `${SITE_URL}${p}` })),
    ...props.flatMap((p) => [`/properties/${p.slug}`, `/properties/${p.slug}/explore`, `/properties/${p.slug}/around`].map((u) => ({ url: `${SITE_URL}${u}` }))),
  ];
}
