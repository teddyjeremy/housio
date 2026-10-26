import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { RegisterForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Create an account", alternates: { canonical: "/register" } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="container-page flex justify-center py-12">
      <div className="card w-full max-w-md p-7">
        <LogoMark size={44} />
        <h1 className="mt-4 font-display text-2xl font-bold text-forest">Join Housio</h1>
        <p className="mt-1 text-sm text-muted">Save stays, share shortlists and book, or list your property in Owner Studio.</p>
        <div className="mt-6"><RegisterForm role={sp.role === "owner" ? "owner" : "guest"} next={sp.next} /></div>
        <p className="mt-5 text-sm text-muted">Already have an account? <Link href="/login" className="font-semibold text-forest underline">Sign in</Link></p>
      </div>
    </div>
  );
}
