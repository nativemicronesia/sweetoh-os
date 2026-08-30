import { redirect } from "next/navigation";
import { getDefaultVenture, getSessionUser } from "@/lib/domains/identity/service";
import { CategoryBrowse } from "./components/category-browse";
import { CreateInvite } from "./components/create-invite";
import {
  FeaturedProducts,
  getFeaturedProductsForHome,
} from "./components/featured-products";
import { HowItWorks } from "./components/how-it-works";
import { StoreHero } from "./components/store-hero";

export default async function HomePage() {
  const session = await getSessionUser();
  if (session?.role === "partner" || session?.role === "owner") {
    redirect("/partner");
  }

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
      <CreateInvite />
    </div>
  );
}
