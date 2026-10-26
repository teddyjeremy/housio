import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import type { PropertyDetail } from "@/types";
import { mainUnit } from "@/lib/listing";

export const DESCRIPTION = "Find and book serviced apartments, studios and homes in Nairobi. Step inside every room with 360° tours, check floor plans and see what is nearby before you book.";
export const DEFAULT_IMAGE = "/stills/kilimani-family-apartment-1.jpg";

export const absolute = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);

export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL, logo: absolute("/icon.svg"), slogan: SITE_TAGLINE },
      {
        "@type": "WebSite", "@id": `${SITE_URL}/#site`, name: SITE_NAME, url: SITE_URL, publisher: { "@id": `${SITE_URL}/#org` }, inLanguage: "en-GB",
        potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
      },
    ],
  };
}

const TYPE: Record<string, string> = { furnished_home: "House", holiday_home: "House", house: "House", villa: "House", studio: "Apartment", apartment: "Apartment", serviced_apartment: "Apartment", suite: "Suite" };

/** Accommodation markup built only from stored listing data: no ratings, no street address. */
export function listingJsonLd(p: PropertyDetail) {
  const u = mainUnit(p);
  const images = p.assets.filter((a) => a.kind === "photo").map((a) => absolute(a.url));
  const amenities = p.amenity_details.filter((a) => a.unit_id === u.id && a.value === "yes")
    .map((a) => ({ "@type": "LocationFeatureSpecification", name: a.label, value: true }));
  return {
    "@context": "https://schema.org",
    "@type": TYPE[p.property_type] ?? "Accommodation",
    "@id": `${SITE_URL}/properties/${p.slug}#listing`,
    name: p.name,
    description: p.summary,
    url: `${SITE_URL}/properties/${p.slug}`,
    image: images,
    address: { "@type": "PostalAddress", addressLocality: p.neighbourhood, addressRegion: "Nairobi", addressCountry: "KE" },
    ...(u.bedrooms != null ? { numberOfBedrooms: u.bedrooms } : {}),
    ...(u.bathrooms != null ? { numberOfBathroomsTotal: Number(u.bathrooms) } : {}),
    occupancy: { "@type": "QuantitativeValue", maxValue: u.max_guests },
    amenityFeature: amenities,
    containedInPlace: { "@type": "Place", name: `${p.neighbourhood}, Nairobi` },
    offers: {
      "@type": "Offer", url: `${SITE_URL}/properties/${p.slug}`, priceCurrency: "KES", price: u.nightly_rate,
      priceSpecification: { "@type": "UnitPriceSpecification", price: u.nightly_rate, priceCurrency: "KES", unitText: "night" },
    },
  };
}
