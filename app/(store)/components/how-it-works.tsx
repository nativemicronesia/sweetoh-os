const STEPS = [
  { n: "1", title: "Pick your piece", body: "Browse the shop, choose your color and size — or send us a custom request.", color: "var(--so-lagoon)" },
  { n: "2", title: "We press it for you", body: "Every order is printed to order in our Lacey, Washington shop. Nothing sits on a shelf.", color: "var(--so-coral)" },
  { n: "3", title: "Open the package", body: "We pack it with care and send it your way. That's the whole story.", color: "var(--so-hibiscus)" },
] as const;

export function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
      <p className="so-eyebrow">How it works</p>
      <h2 className="so-display mt-4 max-w-xl text-4xl text-[color:var(--so-cream)] sm:text-5xl">
        Three steps. Then the <em className="font-normal" style={{ color: "var(--so-hibiscus)" }}>package</em>.
      </h2>
      <ol className="relative mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
        <span aria-hidden className="absolute left-0 right-0 top-8 hidden border-t-2 border-dashed sm:block" style={{ borderColor: "var(--so-border)" }} />
        {STEPS.map((step) => (
          <li key={step.n} className="relative space-y-4">
            <span className="so-display relative grid h-16 w-16 place-items-center rounded-full text-3xl italic text-white" style={{ background: step.color }}>
              {step.n}
            </span>
            <h3 className="so-display text-2xl text-[color:var(--so-cream)]">{step.title}</h3>
            <p className="max-w-xs text-sm leading-relaxed so-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
