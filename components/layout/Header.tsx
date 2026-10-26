import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/auth/roles";
import { logout } from "@/app/actions/auth";

const NAV = [
  { href: "/search", label: "Stays" },
  { href: "/fit", label: "Fit" },
  { href: "/compare", label: "Compare" },
  { href: "/account/collections", label: "Saved" },
];

export async function Header() {
  const user = await getCurrentUser().catch(() => null);
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ivory/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Housio home"><Logo /></Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="btn btn-ghost px-4">{n.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link href={ROLE_HOME[user.role]} className="btn btn-secondary">
                {user.role === "owner" ? "Owner Studio" : user.role === "admin" ? "Admin" : "My trips"}
                {user.unread > 0 && <span className="rounded-full bg-champagne px-1.5 text-[10px] text-forest-700" aria-label={`${user.unread} unread notifications`}>{user.unread}</span>}
              </Link>
              <form action={logout}><button className="btn btn-ghost">Sign out</button></form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">Sign in</Link>
              <Link href="/register" className="btn btn-primary">Join Housio</Link>
            </>
          )}
        </div>
        <details className="relative md:hidden">
          <summary className="btn btn-secondary list-none px-4" aria-label="Open menu">Menu</summary>
          <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-line bg-white p-3 shadow-xl">
            <div className="mb-2 border-b border-line pb-3"><Logo size={26} /></div>
            {NAV.map((n) => <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-sage/60">{n.label}</Link>)}
            {user ? (
              <>
                <Link href={ROLE_HOME[user.role]} className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-sage/60">My account</Link>
                <form action={logout}><button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-sage/60">Sign out</button></form>
              </>
            ) : (
              <Link href="/login" className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-sage/60">Sign in</Link>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}
