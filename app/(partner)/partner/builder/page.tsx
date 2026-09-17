import Link from "next/link";
import { CreationSteps } from "../components/creation-steps";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import {
  assertBuilderRole,
  listBuilderBlanks,
} from "@/lib/domains/intelligence/partner-builder";
import {
  listActiveProducts,
  getPrimaryProductImageUrl,
} from "@/lib/domains/catalog/service";
import { ProductBuilderForm } from "./product-builder-form";
import { BlankGallery } from "./blank-gallery";
export const maxDuration = 180;
export default async function BuilderPage() {
  const session = await requirePartnerWorkspace();
  assertBuilderRole(session);
  const [saved, products] = await Promise.all([
    listBuilderBlanks(session),
    listActiveProducts(session.ventureId),
  ]);
  const catalog = await Promise.all(
    products
      .filter((p) => !saved.some((b) => b.id === p.id))
      .map(async (p) => ({
        id: p.id,
        name: p.name,
        imageUrl: await getPrimaryProductImageUrl(p.id),
      })),
  );
  return (
    <div className="space-y-8">
      <CreationSteps current={1} />
      <header className="studio-page-heading">
        <div>
          <p className="studio-kicker">MADE YOUR WAY · SWEET’OH</p>
          <h1>Create a product</h1>
          <p>Pick a blank, add your artwork, make it yours.</p>
        </div>
        <a href="#new-blank" className="studio-primary">
          ＋ Create a new blank
        </a>
      </header>
      <BlankGallery blanks={[...saved, ...catalog]} />
      <details open id="new-blank" className="blank-photo-section">
        <summary>
          <strong>Create a blank from any product photo</strong>
          <span>
            Shirts, towels, hats, tumblers, blankets — your library has no
            catalog limits.
          </span>
        </summary>
        <div className="mt-5">
          <ProductBuilderForm />
        </div>
      </details>
      <p className="text-sm so-muted">
        Still preparing a blank?{" "}
        <Link className="underline" href="/partner">
          Find your saved work in My products.
        </Link>
      </p>
    </div>
  );
}
