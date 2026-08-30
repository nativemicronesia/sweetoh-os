import { notFound } from "next/navigation";
import {
  getActiveProductBySlug,
  getProductMedia,
} from "@/lib/domains/catalog/service";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { NotFoundError } from "@/lib/shared/errors";
import { formatPrice } from "@/lib/shared/format";
import { productMediaPublicUrl } from "@/lib/storage/client";
import { AddToCartButton } from "../../components/add-to-cart-button";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const venture = await getDefaultVenture();

  let product;
  try {
    product = await getActiveProductBySlug({ ventureId: venture.id, slug });
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  const media = await getProductMedia(product.id);
  const images = media
    .filter((item) => item.objectKey)
    .map((item) => productMediaPublicUrl(item.objectKey!));
  const primaryImage = images[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-3">
          <div
            className="aspect-[4/5] overflow-hidden"
            style={{ background: "var(--so-surface)" }}
          >
            {primaryImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryImage}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm so-muted">
                Image coming
              </div>
            )}
          </div>
          {images.length > 1 ? (
            <div className="grid grid-cols-4 gap-2">
              {images.slice(1).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt={product.name}
                  className="aspect-square w-full object-cover"
                  style={{ background: "var(--so-surface)" }}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col justify-center space-y-8 lg:py-8">
          <div>
            <p className="so-eyebrow">Sweet&apos;Oh Creations</p>
            <h1 className="so-display mt-4 text-3xl text-[color:var(--so-cream)] sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-4 text-lg so-muted">{formatPrice(product.priceCents)}</p>
          </div>

          {product.description ? (
            <p className="max-w-md text-sm leading-relaxed so-muted sm:text-base">
              {product.description}
            </p>
          ) : null}

          <div className="max-w-sm space-y-4">
            <AddToCartButton
              productId={product.id}
              slug={product.slug}
              name={product.name}
              priceCents={product.priceCents}
              imageUrl={primaryImage}
            />
            <p className="text-xs leading-relaxed so-muted">
              Printed on demand · ships after press. Made for Micronesia — and wherever you
              are.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
