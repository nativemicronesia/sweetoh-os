import {
  listPrintifyBlueprints,
  catalogCategory,
} from "@/lib/integrations/printify/catalog";
import { CreationSteps } from "../components/creation-steps";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import {
  assertBuilderRole,
  listBuilderBlanks,
} from "@/lib/domains/intelligence/partner-builder";
import { ProductBuilderForm } from "./product-builder-form";
import { BlankGallery } from "./blank-gallery";
import { buttonVariants } from "@/components/ui/button";
export const maxDuration = 180;
export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  const session = await requirePartnerWorkspace();
  assertBuilderRole(session);
  const [local, query, remote] = await Promise.all([
    // Saved blanks only: published designs are products, not catalog blanks.
    listBuilderBlanks(session),
    searchParams,
    listPrintifyBlueprints()
      .then((rows) => ({ rows, error: "" }))
      .catch(() => ({
        rows: [],
        error:
          "Catalog temporarily unavailable. You can still design your saved blanks below.",
      })),
  ]);
  const blanks = [
    ...local,
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
    <div className="space-y-7">
      <CreationSteps current={1} />
      <header className="studio-page-heading">
        <div>
          <h1>Catalog</h1>
          <p>Choose a product. Add your design. Make it local.</p>
        </div>
        <a
          href="/partner/catalog/new"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          ＋ Add your own product
        </a>
      </header>
      {remote.error && (
        <p role="alert" className="print-error">
          {remote.error}
        </p>
      )}
      <BlankGallery blanks={blanks} />
      <details
        open={query.add === "1"}
        id="new-blank"
        className="blank-photo-section"
      >
        <summary>
          <strong>List a finished product</strong>
          <span>
            Already made it? Keep your real photos and list it as is. To design
            on a product, use “Add your own product” instead.
          </span>
        </summary>
        <div className="mt-5">
          <ProductBuilderForm />
        </div>
      </details>
    </div>
  );
}
