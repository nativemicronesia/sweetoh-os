import { notFound } from "next/navigation";
import {
  getActiveProductBySlug,
  getProductMedia,
} from "@/lib/domains/catalog/service";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { NotFoundError } from "@/lib/shared/errors";
import { productMediaPublicUrl } from "@/lib/storage/client";
import { ProductBuy } from "../../components/product-buy";

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
  // Color-tagged mockups switch with the color picker; the rest form the gallery.
  const images = media
    .filter((item) => item.objectKey && !item.color)
    .map((item) => productMediaPublicUrl(item.objectKey!));
  const colorImages = Object.fromEntries(
    media
      .filter((item) => item.objectKey && item.color)
      .map((item) => [item.color!, productMediaPublicUrl(item.objectKey!)]),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <ProductBuy
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          variantOptions: product.variantOptions ?? null,
        }}
        images={images}
        colorImages={colorImages}
      />
    </div>
  );
}
