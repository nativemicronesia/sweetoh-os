import Link from "next/link";

type StoreHeroProps = {
  heroImageUrl: string | null;
  heroImageAlt: string;
};

export function StoreHero({ heroImageUrl, heroImageAlt }: StoreHeroProps) {
  return (
    <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="so-hero-wash so-grain relative min-h-[calc(100svh-4.25rem)] overflow-hidden">
        {heroImageUrl ? (
          <div className="pointer-events-none absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageUrl}
              alt={heroImageAlt}
              className="so-hero-image h-full w-full object-cover opacity-45"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(105deg, rgba(7,6,5,0.92) 0%, rgba(7,6,5,0.72) 42%, rgba(7,6,5,0.35) 100%)",
              }}
            />
          </div>
        ) : null}

        <div className="relative mx-auto flex min-h-[calc(100svh-4.25rem)] w-full max-w-6xl flex-col justify-end px-5 pb-16 pt-24 sm:px-8 sm:pb-24">
          <p className="so-eyebrow so-animate-in">Sweet&apos;Oh Creations</p>
          <h1 className="so-display so-animate-in-delay mt-5 max-w-3xl text-[clamp(2.75rem,9vw,5.75rem)] text-[color:var(--so-cream)]">
            Print the islands.
            <br />
            Wear the future.
          </h1>
          <p className="so-animate-in-delay-2 mt-5 max-w-md text-base leading-relaxed so-muted sm:text-lg">
            Micronesian print-on-demand. Shop a piece, or create yours — then wait for the
            package.
          </p>
          <div className="so-animate-in-delay-2 mt-9 flex flex-wrap gap-3">
            <Link href="/collections" className="so-btn-primary">
              Shop
            </Link>
            <Link href="/studio" className="so-btn-ghost">
              Create
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
