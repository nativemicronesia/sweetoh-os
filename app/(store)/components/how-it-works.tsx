const STEPS = [
  {
    n: "01",
    title: "Choose or create",
    body: "Browse ready designs, or open Studio and place your art on a blank.",
  },
  {
    n: "02",
    title: "Checkout",
    body: "One cart. Secure pay. We print on demand — nothing sits on a shelf.",
  },
  {
    n: "03",
    title: "Wait for the package",
    body: "We press, pack, and ship. You open the box. That’s the whole story.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
      <p className="so-eyebrow">How it works</p>
      <h2 className="so-display mt-4 max-w-xl text-3xl text-[color:var(--so-cream)] sm:text-4xl">
        Three steps. Then the package.
      </h2>
      <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
        {STEPS.map((step) => (
          <li key={step.n} className="space-y-3">
            <p className="font-mono text-xs tabular-nums so-muted">{step.n}</p>
            <h3 className="so-display text-xl text-[color:var(--so-cream)]">{step.title}</h3>
            <p className="text-sm leading-relaxed so-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
