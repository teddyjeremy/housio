import { demoLogin } from "@/app/actions/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/site";

export function DemoLogins({ next }: { next?: string }) {
  return (
    <section aria-labelledby="demo-heading" className="card p-6" id="demo">
      <h2 id="demo-heading" className="font-display text-2xl font-bold text-forest">Try it</h2>
      <p className="mt-1 text-sm text-muted">Sign in with one click as a guest, owner or admin, or use the email below with password <code className="rounded bg-ivory px-1.5 py-0.5 text-ink">{DEMO_PASSWORD}</code>.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {DEMO_ACCOUNTS.map((a) => (
          <form key={a.email} action={demoLogin} className="rounded-2xl border border-line bg-ivory/60 p-4">
            <input type="hidden" name="email" value={a.email} />
            {next && <input type="hidden" name="next" value={next} />}
            <p className="font-display font-semibold text-forest">{a.label}</p>
            <p className="mt-1 text-xs text-muted">{a.blurb}</p>
            <p className="mt-2 break-all font-mono text-[11px] text-ink">{a.email}</p>
            <button className="btn btn-primary mt-3 w-full py-2" data-testid={`demo-${a.role}`}>Sign in as {a.label}</button>
          </form>
        ))}
      </div>
    </section>
  );
}
