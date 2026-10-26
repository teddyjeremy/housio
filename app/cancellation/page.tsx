import { Prose } from "@/components/ui/Prose";
import { POLICY_TEXT } from "@/lib/cancellation";
export const metadata = { title: "Cancellation policies", alternates: { canonical: "/cancellation" } };
export default function Page() {
  return (
    <Prose title="Cancellation and refunds">
      <p>Each listing uses one of three policies. Check-in is treated as 14:00 Nairobi time on the arrival date.</p>
      {(Object.keys(POLICY_TEXT) as (keyof typeof POLICY_TEXT)[]).map((k) => (<div key={k}><h2>{POLICY_TEXT[k].title}</h2><p>{POLICY_TEXT[k].summary}</p></div>))}
      <h2>Deposits</h2><p>Refundable deposits are held separately and returned after check-out, subject to the house rules.</p>
      <h2>Unpaid holds</h2><p>If you don&apos;t complete payment within 15 minutes, or a payment fails, the dates are released and nothing is charged.</p>
    </Prose>
  );
}
