import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { searchProperties } from "@/lib/db/queries";
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const props = await searchProperties({}).catch(() => []);
  const now = new Date();
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1, lastModified: now },
    ...["/search", "/fit", "/compare"].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "daily" as const, priority: 0.8, lastModified: now })),
    ...props.flatMap((p) => [
      { url: `${SITE_URL}/properties/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.9, lastModified: now },
      { url: `${SITE_URL}/properties/${p.slug}/explore`, changeFrequency: "monthly" as const, priority: 0.6, lastModified: now },
      { url: `${SITE_URL}/properties/${p.slug}/around`, changeFrequency: "monthly" as const, priority: 0.5, lastModified: now },
    ]),
    ...["/support", "/cancellation", "/terms", "/privacy", "/licences"].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "yearly" as const, priority: 0.3 })),
  ];
}
