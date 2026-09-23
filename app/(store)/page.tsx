import { getDefaultVenture } from "@/lib/domains/identity/service";
import { CategoryBrowse } from "./components/category-browse";
import { CreateInvite } from "./components/create-invite";
import { CustomOrdersBand } from "./components/custom-orders-band";
import {
  FeaturedProducts,
  getFeaturedProductsForHome,
} from "./components/featured-products";
import { HowItWorks } from "./components/how-it-works";
import { StoreHero } from "./components/store-hero";

export default async function HomePage() {
  const venture = await getDefaultVenture();
  const featured = await getFeaturedProductsForHome(venture.id);
  const hero = featured.find((item) => item.imageUrl) ?? featured[0] ?? null;

  return (
    <div>
      <StoreHero
        heroImageUrl={hero?.imageUrl ?? null}
        heroImageAlt={hero?.product.name ?? "Sweet'Oh Creations"}
      />
      <HowItWorks />
      <CategoryBrowse ventureId={venture.id} />
      <FeaturedProducts ventureId={venture.id} items={featured} />
      <CustomOrdersBand />
      <CreateInvite />
    </div>
  );
}
