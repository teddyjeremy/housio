import Link from "next/link";
export default function NotFound() {
  return <div className="container-page py-24 text-center"><h1 className="font-display text-3xl font-bold text-forest">We couldn&apos;t find that page</h1><Link href="/search" className="btn btn-primary mt-6">Browse stays</Link></div>;
}
