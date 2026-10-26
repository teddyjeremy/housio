import { Prose } from "@/components/ui/Prose";
export const metadata = { title: "Terms" };
export default function Page() {
  return (
    <Prose title="Terms of use">
      <p>Housio is a platform that connects guests with owners of accommodation. Owners are responsible for the accuracy of their listings. Housio labels information as owner-provided or verified.</p>
      <h2>Tours and floor plans</h2>
      <p>360° tours, photos and floor plans help you picture a stay. Map positions show a central point in the neighbourhood; the exact address is shared after booking.</p>
      <h2>Bookings</h2>
      <p>A reservation is confirmed only after payment succeeds. Unpaid holds expire after 15 minutes. Cancellations follow the policy shown on the listing at the time of booking.</p>
      <p>The Housio name and brand are provisional, pending trademark, business-name and domain checks.</p>
    </Prose>
  );
}
