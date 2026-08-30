import Link from "next/link";

export function CreateInvite() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
      <div
        className="relative overflow-hidden border px-6 py-14 sm:px-12 sm:py-20"
        style={{
          borderColor: "var(--so-border)",
          background:
            "linear-gradient(135deg, var(--so-surface) 0%, var(--so-dark) 55%, #16130f 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full opacity-30"
          style={{
            background: "radial-gradient(circle, rgba(201,168,76,0.35), transparent 70%)",
          }}
        />
        <p className="so-eyebrow relative">Studio</p>
        <h2 className="so-display relative mt-4 max-w-xl text-3xl text-[color:var(--so-cream)] sm:text-5xl">
          Make it yours.
        </h2>
        <p className="relative mt-4 max-w-md text-sm leading-relaxed so-muted sm:text-base">
          Pick a blank. Drop in AI, an upload, or a library design. Preview the mockup — then
          add to cart.
        </p>
        <Link href="/studio" className="so-btn-primary relative mt-8">
          Open Studio
        </Link>
      </div>
    </section>
  );
}
