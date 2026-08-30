export function StaticPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-5 py-12 sm:px-8 sm:py-16">
      <p className="so-eyebrow">Sweet&apos;Oh</p>
      <h1 className="so-display text-3xl text-[color:var(--so-cream)] sm:text-4xl">
        {title}
      </h1>
      <div className="space-y-3 text-sm leading-relaxed so-muted">{children}</div>
    </div>
  );
}
