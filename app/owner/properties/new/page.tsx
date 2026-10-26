import type { Metadata } from "next";
import { PropertyForm } from "@/components/owner/PropertyForm";
import { getAmenities, getNeighbourhoods } from "@/lib/db/queries";

export const metadata: Metadata = { title: "New listing", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewListing() {
  const [hoods, amenities] = await Promise.all([getNeighbourhoods(), getAmenities()]);
  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-bold text-forest">Create a listing</h1>
      <PropertyForm id={null} neighbourhoods={hoods} amenities={amenities} initial={{
        name: "", property_type: "serviced_apartment", unit_type: "apartment", neighbourhood: "", summary: "", description: "", house_rules: "",
        cancellation_policy: "moderate", stay_short: true, stay_long: false, max_guests: 2, bedrooms: 1, bathrooms: 1, floor_area_m2: "",
        nightly_rate: 5000, weekly_discount_pct: 0, monthly_discount_pct: 0, cleaning_fee: 0, deposit: 0, min_nights: 1,
        amenities: Object.fromEntries(amenities.map((a) => [a.code, "unknown"])),
      }} />
    </>
  );
}
