export function Prose({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="font-display text-3xl font-bold text-forest">{title}</h1>
      <div className="mt-6 space-y-4 text-ink/90 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-forest [&_a]:underline [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </div>
  );
}
