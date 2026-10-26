import Link from "next/link";
import { requireRole } from "@/lib/auth/session";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireRole(["owner"]);
  return (
    <div className="container-page py-10">
      <p className="eyebrow">Owner Studio · {user.display_name}</p>
      <nav aria-label="Owner Studio" className="mt-3 flex flex-wrap gap-2 border-b border-line pb-4">
        <Link href="/owner" className="btn btn-ghost">Dashboard</Link>
        <Link href="/owner/properties/new" className="btn btn-ghost">New listing</Link>
        <Link href="/owner/bookings" className="btn btn-ghost">Reservations</Link>
        <Link href="/account" className="btn btn-ghost">Notifications</Link>
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
