import { getDefaultVenture } from "@/lib/domains/identity/service";
import { BrandStory } from "./components/brand-story";
import { CategoryBrowse } from "./components/category-browse";
import { CreateInvite } from "./components/create-invite";
import { CustomOrdersBand } from "./components/custom-orders-band";
import {
  FeaturedProducts,
  getFeaturedProductsForHome,
} from "./components/featured-products";
import { HowItWorks } from "./components/how-it-works";
import { ProductMarquee } from "./components/product-marquee";
import { StoreHero } from "./components/store-hero";

export default async function HomePage() {
  const venture = await getDefaultVenture();
  const featured = await getFeaturedProductsForHome(venture.id);
  const heroTiles = featured
    .filter((item) => item.imageUrl)
    .slice(0, 3)
    .map((item) => ({ imageUrl: item.imageUrl, label: item.product.name, href: `/products/${item.product.slug}` }));

  return (
    <div>
      <StoreHero tiles={heroTiles} />
      <ProductMarquee />
      <CategoryBrowse ventureId={venture.id} />
      <FeaturedProducts ventureId={venture.id} items={featured} />
      <BrandStory />
      <HowItWorks />
      <CustomOrdersBand />
      <CreateInvite />
    </div>
  );
}
