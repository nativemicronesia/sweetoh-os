import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { listPrintifyBlueprints, catalogCategory } from "@/lib/integrations/printify/catalog";
import { requireCreator } from "@/lib/domains/identity/service";
import { listBuilderBlanks } from "@/lib/domains/intelligence/partner-builder";
import { BlankGallery } from "@/app/(partner)/partner/builder/blank-gallery";

export const metadata = { title: "Catalog" };
export const maxDuration = 60;

export default async function CreatorCatalogPage() {
  const session = await requireCreator();
  const [mine, remote] = await Promise.all([
    listBuilderBlanks(session).catch(() => []),
    listPrintifyBlueprints()
      .then((rows) => ({ rows, error: "" }))
      .catch(() => ({ rows: [], error: "The catalog is taking a break. Your saved products are below — try again in a minute." })),
  ]);
  const blanks = [
    ...mine.map((b) => ({ ...b, brand: "Your product" })),
    ...remote.rows.map((p) => ({
      id: `printify-${p.id}`,
      name: p.title,
      category: catalogCategory(p.title),
      imageUrl: p.images[0] || null,
      brand: p.brand,
      model: p.model,
    })),
  ];
  return (
    <div className="cs-stack" style={{ gap: 22 }}>
      <header className="cs-between" style={{ alignItems: "end" }}>
        <div>
          <div className="cs-eyebrow">Step 1 · Pick a product</div>
          <h1 className="cs-h1">The catalog</h1>
          <p className="cs-sub">{remote.rows.length ? `${remote.rows.length.toLocaleString()} print-on-demand products` : "Print-on-demand products"} from Printify&apos;s network. Choose one, pick its colors and sizes, then design it in the Studio.</p>
        </div>
        <Link href="/studio/skink" className="cs-btn cs-btn-ghost">
          <MessageCircle size={16} /> Not sure? Ask Skink
        </Link>
      </header>
      {remote.error && <p className="cs-alert" role="alert">{remote.error}</p>}
      <div className="sweetoh-studio cs-catalog">
        <BlankGallery blanks={blanks} hrefBase="/studio/catalog" tagline="Choose a product to design" />
      </div>
    </div>
  );
}
