import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SITE_TAGLINE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-24 bg-forest text-ivory/80">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo inverse />
          <p className="mt-4 max-w-sm text-sm">{SITE_TAGLINE} Housio pairs conventional booking with 360° room tours, floor plans and real neighbourhood data.</p>
          <p className="mt-4 max-w-md text-xs text-ivory/60">Map data and nearby places © OpenStreetMap contributors (ODbL). <Link href="/licences" className="underline">Credits</Link></p>
        </div>
        <nav aria-label="Explore" className="text-sm">
          <p className="mb-3 font-display font-semibold text-ivory">Explore</p>
          <ul className="space-y-2">
            <li><Link href="/search">All stays</Link></li><li><Link href="/fit">Housio Fit</Link></li>
            <li><Link href="/compare">Compare</Link></li><li><Link href="/register?role=owner">List your property</Link></li>
          </ul>
        </nav>
        <nav aria-label="Policies" className="text-sm">
          <p className="mb-3 font-display font-semibold text-ivory">Trust</p>
          <ul className="space-y-2">
            <li><Link href="/privacy">Privacy</Link></li><li><Link href="/terms">Terms</Link></li>
            <li><Link href="/cancellation">Cancellation</Link></li><li><Link href="/support">Support</Link></li>
            <li><Link href="/licences">Data &amp; asset licences</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-ivory/10 py-5 text-center text-xs text-ivory/50">© {new Date().getFullYear()} Housio. Name and brand are provisional.</div>
    </footer>
  );
}
