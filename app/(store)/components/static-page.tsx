export function StaticPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="space-y-3 text-sm leading-relaxed text-neutral-600">
        {children}
      </div>
    </div>
  );
}
