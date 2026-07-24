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
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="aspect-square overflow-hidden rounded-lg bg-neutral-100">
          {primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryImage}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
              No image yet
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
                className="aspect-square w-full rounded object-cover"
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Sweet&apos;Oh Creations
          </p>
          <h1 className="mt-2 text-2xl font-semibold">{product.name}</h1>
          <p className="mt-2 text-xl text-neutral-900">
            {formatPrice(product.priceCents)}
          </p>
        </div>

        {product.description ? (
          <p className="text-sm leading-relaxed text-neutral-600">
            {product.description}
          </p>
        ) : null}

        <AddToCartButton
          productId={product.id}
          slug={product.slug}
          name={product.name}
          priceCents={product.priceCents}
          imageUrl={primaryImage}
        />

        <p className="text-xs text-neutral-500">
          Printed on demand. Shipping estimates available at checkout.
        </p>
      </div>
    </div>
  );
}
