import Link from "next/link";
import { requireRole } from "@/lib/auth/session";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireRole(["guest", "owner", "admin"]);
  return (
    <div className="container-page py-10">
      <p className="eyebrow">Signed in as {user.display_name}</p>
      <nav aria-label="Account" className="mt-3 flex flex-wrap gap-2 border-b border-line pb-4">
        <Link href="/account" className="btn btn-ghost">Overview</Link>
        <Link href="/account/bookings" className="btn btn-ghost">Bookings</Link>
        <Link href="/account/collections" className="btn btn-ghost">Collections</Link>
        {user.role === "owner" && <Link href="/owner" className="btn btn-ghost">Owner Studio</Link>}
        {user.role === "admin" && <Link href="/admin" className="btn btn-ghost">Admin</Link>}
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
