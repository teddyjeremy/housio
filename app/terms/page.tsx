import { Prose } from "@/components/ui/Prose";
export const metadata = { title: "Terms" };
export default function Page() {
  return (
    <Prose title="Terms of use">
      <p>Housio is a platform that connects guests with owners of accommodation. Owners are responsible for the accuracy of their listings. Housio labels information as owner-provided or verified.</p>
      <h2>Demonstration listings</h2>
      <p>The ten Nairobi listings marked “Demo listing” are fictional. They are not real rentals, the interiors are illustrative, their map positions are representative points rather than addresses, and bookings on them use a simulated payment with no money moving.</p>
      <h2>3D and floor plans</h2>
      <p>Interiors labelled “Illustrative 3D” are generated from templates and are not replicas of a property. Only models labelled “Verified 3D model” have been checked against the real unit.</p>
      <h2>Bookings</h2>
      <p>A reservation is confirmed only after payment succeeds. Unpaid holds expire after 15 minutes. Cancellations follow the policy shown on the listing at the time of booking.</p>
      <p>The Housio name and brand are provisional, pending trademark, business-name and domain checks.</p>
    </Prose>
  );
}
