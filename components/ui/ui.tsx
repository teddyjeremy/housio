import Link from "next/link";
import { TRUST } from "@/lib/trust";

export function TrustBadge({ kind, className = "" }: { kind: keyof typeof TRUST; className?: string }) {
  const t = TRUST[kind];
  const tone = {
    verified: "bg-forest text-white",
    owner: "bg-sage text-forest",
    illustrative: "bg-champagne/25 text-forest-700 border border-champagne/60",
    demo: "bg-ink/85 text-ivory",
  }[t.tone];
  return (
    <span title={t.help} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone} ${className}`} data-trust={kind}>
      {t.label}
    </span>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="font-display text-3xl font-bold text-forest sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 max-w-3xl text-muted">{children}</div>}
    </div>
  );
}

export function Empty({ title, children, href, cta }: { title: string; children?: React.ReactNode; href?: string; cta?: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="font-display text-lg font-semibold text-forest">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
      {href && cta && <Link href={href} className="btn btn-primary mt-5">{cta}</Link>}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-forest">{value}</p>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    confirmed: "bg-forest text-white", completed: "bg-sage text-forest", pending: "bg-champagne/30 text-forest-700",
    cancelled: "bg-ink/10 text-ink", expired: "bg-ink/10 text-muted", payment_failed: "bg-red-100 text-red-800",
    published: "bg-forest text-white", draft: "bg-ink/10 text-ink", pending_review: "bg-champagne/30 text-forest-700", rejected: "bg-red-100 text-red-800",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[status] ?? "bg-ink/10"}`}>{status.replace("_", " ")}</span>;
}

export function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" | "error" | "success" }) {
  const c = { info: "bg-sage/60 text-forest", warn: "bg-champagne/20 text-forest-700", error: "bg-red-50 text-red-800", success: "bg-forest text-white" }[tone];
  return <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${c}`}>{children}</div>;
}
