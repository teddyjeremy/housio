import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { LoginForm } from "@/components/forms/AuthForms";
import { DemoLogins } from "@/components/DemoLogins";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string; demo_failed?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[420px_1fr]">
      <div className="card p-7">
        <LogoMark size={44} />
        <h1 className="mt-4 font-display text-2xl font-bold text-forest">Welcome back</h1>
        {sp.expired && <p className="mt-2 text-sm text-champagne-600">Please sign in to continue.</p>}
        {sp.demo_failed && <p role="alert" className="mt-2 text-sm text-red-700">That sign-in didn&apos;t work. Try again shortly.</p>}
        <div className="mt-6"><LoginForm next={sp.next} /></div>
        <p className="mt-5 text-sm text-muted">New to Housio? <Link href={`/register${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`} className="font-semibold text-forest underline">Create an account</Link></p>
      </div>
      <DemoLogins next={sp.next} />
    </div>
  );
}
