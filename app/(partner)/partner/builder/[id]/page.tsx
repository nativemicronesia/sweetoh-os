import Link from "next/link";
import { CreationSteps } from "../../components/creation-steps";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getOwnedBuilder } from "@/lib/domains/intelligence/partner-builder";
import { getAssetSignedUrl } from "@/lib/domains/assets/service";
import { safeSourceUrl } from "@/lib/domains/intelligence/product-research-schema";
import { BuilderControls } from "./builder-controls";

export const maxDuration = 180;

export default async function BuilderDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePartnerWorkspace();
  const { id } = await params;
  const { product, record } = await getOwnedBuilder(session, id);
  const imageId = record.mockupAssetId || product.sourceAssetId;
  const image = imageId ? await getAssetSignedUrl({ ventureId: session.ventureId, assetId: imageId }) : null;
  const research = record.research;
  return <div className="space-y-6"><CreationSteps current={1} />
    <Link href="/partner/builder" className="so-link text-sm">← Your products & blanks</Link>
    <div className="grid gap-8 lg:grid-cols-2">
      <div>{image && <img src={image} alt={product.name} className="aspect-square w-full rounded-3xl bg-white object-contain" />}
        <p className="mt-3 text-sm so-muted">{record.mockupAssetId ? "AI-generated preview. Check shape, color, and printable area against the physical product." : "Your original product photograph."}</p></div>
      <div className="space-y-5"><p className="so-eyebrow">{record.purpose === "blank" ? "Reusable blank · private" : "Product draft"}</p>
        <h1 className="so-display text-3xl">{product.name}</h1><p className="so-muted">{product.description}</p>
        {research && <section className="rounded-2xl border border-[var(--so-border)] p-5">
          <h2 className="font-semibold">{research.identity === "matched" ? "Source match found — check before using" : research.identity === "likely" ? "Possible match — needs your check" : "Exact model not established"}</h2>
          <p className="mt-2 text-sm so-muted">{research.evidence}</p>
          {research.unknowns.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{research.unknowns.map((value, i) => <li key={i}>{value}</li>)}</ul>}
        </section>}
        <BuilderControls id={id} confirmed={record.confirmed} blank={record.purpose === "blank"} canGenerate={true} hasMockup={Boolean(record.mockupAssetId)} />
        {record.confirmed && record.purpose === "blank" && <Link href={`/partner/canvas?blank=${id}`} className="so-btn-primary">Design on this blank →</Link>}
        {record.purpose === "finished" && <Link href={`/partner/review/${id}`} className="so-btn-primary">Continue to price & publish →</Link>}
        {record.purpose === "blank" && <p className="text-sm so-muted">Saved for reuse. Your blank is never a shop listing; create a finished design on it first.</p>}
      </div>
    </div>
    {research && <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-2xl border border-[var(--so-border)] p-5"><h2 className="font-semibold">Supplier specifications</h2>
        <p className="mt-2 text-sm so-muted">Supplier details are not a promise of your available stock. Confirm which options you offer.</p>
        <dl className="mt-4 space-y-3">{research.specifications.map((spec, i) => <div key={i}><dt className="text-sm font-medium">{spec.label}</dt><dd className="text-sm so-muted">{spec.value} <a href={spec.sourceUrl} target="_blank" rel="noreferrer" className="underline">Source ↗</a></dd></div>)}</dl>
      </section>
      <section className="rounded-2xl border border-[var(--so-border)] p-5"><h2 className="font-semibold">Research sources</h2>
        <ul className="mt-4 space-y-3">{research.sources.filter(s => safeSourceUrl(s.url)).map((source, i) => <li key={i}><a className="so-link" href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li>)}</ul>
        {!research.sources.length && <p className="mt-3 text-sm so-muted">No verified source returned. Use a label photo or supplier link to identify the model.</p>}
      </section>
    </div>}
  </div>;
}
