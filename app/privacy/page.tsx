import { Prose } from "@/components/ui/Prose";
export const metadata = { title: "Privacy" };
export default function Page() {
  return (
    <Prose title="Privacy notice">
      <p>Housio collects only what it needs to run your account and bookings: your name, email, a hashed password, your bookings, saved collections and reviews.</p>
      <h2>How we use it</h2>
      <ul><li>To sign you in and keep your session secure (an HTTP-only cookie).</li><li>To hold, confirm and cancel reservations.</li><li>To show owners the name on bookings for their own listings only.</li></ul>
      <p>Other guests never see your bookings or contact details. Availability calendars show booked nights without saying who booked them.</p>
      <h2>Third parties</h2>
      <p>Maps load tiles from OpenFreeMap. Place data comes from OpenStreetMap. We do not use advertising trackers.</p>
      <h2>Your choices</h2>
      <p>Contact support to export or delete your account data.</p>
    </Prose>
  );
}
