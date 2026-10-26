import Link from "next/link";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"]);
  return (
    <div className="container-page py-10">
      <p className="eyebrow">Administration</p>
      <nav aria-label="Admin" className="mt-3 flex gap-2 border-b border-line pb-4">
        <Link href="/admin" className="btn btn-ghost">Overview</Link>
        <Link href="/admin/listings" className="btn btn-ghost">Listing review</Link>
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
