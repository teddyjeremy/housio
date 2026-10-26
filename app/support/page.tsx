import { Prose } from "@/components/ui/Prose";
export const metadata = { title: "Support" };
export default function Page() {
  return (
    <Prose title="Support">
      <p>Need help with a booking or a listing? Start with your booking page, where you can see the price breakdown, cancel under the listing&apos;s policy and review a completed stay.</p>
      <h2>Common questions</h2>
      <ul>
        <li><strong>How do I use the 360° tour?</strong> Drag or use the arrow keys to look around, scroll or pinch to zoom, and pick a room from the tabs or the floor plan.</li>
        <li><strong>Are distances walking distances?</strong> No. They are straight-line distances from the listing&apos;s location.</li>
        <li><strong>Can I book one room of an apartment?</strong> Only where the owner offers it as its own unit.</li>
      </ul>
      <p>Support contact details will be published before launch.</p>
    </Prose>
  );
}
