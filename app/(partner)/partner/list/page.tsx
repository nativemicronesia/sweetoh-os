import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { PRODUCT_CATEGORY_META } from "@/lib/domains/catalog/categories";
import { LISTING_MAX_PHOTOS } from "@/lib/domains/catalog/own-listing";
import { ListProductForm } from "./list-product-form";

export const metadata = { title: "Add a product you already make" };

export default async function ListProductPage() {
  await requirePartnerWorkspace();
  return (
    <div className="space-y-6" style={{ maxWidth: 860 }}>
      <Link href="/partner/products" className="inline-flex items-center gap-2 text-sm"><ArrowLeft size={16} /> My products</Link>
      <header className="studio-page-heading">
        <div>
          <p className="studio-kicker">Already selling it? Put it in the shop</p>
          <h1>Add a product you already make</h1>
          <p>Drop in a photo of something you already sell. Skink writes the listing and makes a clean shop photo — you check it and publish. Then your photo becomes a design blank, so you can make new designs on that same product.</p>
        </div>
      </header>
      <ListProductForm categories={PRODUCT_CATEGORY_META.map((c) => ({ value: c.value, label: c.label }))} maxPhotos={LISTING_MAX_PHOTOS} />
    </div>
  );
}
