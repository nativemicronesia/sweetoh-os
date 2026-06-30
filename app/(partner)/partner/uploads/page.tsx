import { requireRole } from "@/lib/domains/identity/service";
import { listAssets } from "@/lib/domains/assets/service";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import { uploadSweetohDesignAction } from "../actions/assets";

type PartnerUploadsPageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function PartnerUploadsPage({
  searchParams,
}: PartnerUploadsPageProps) {
  const session = await requireRole("partner");
  const query = await searchParams;

  const assets = await listAssets({
    ventureId: session.ventureId,
    uploadedById: session.appUser.id,
  });
  const uploads = assets.filter((asset) => asset.assetType === "sweetoh_design");

  return (
    <div className="space-y-6">
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />

      <div>
        <h1 className="text-2xl font-semibold">Design uploads</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Upload Sweet&apos;Oh design files. They stay in draft until an owner
          approves them in the Design Library.
        </p>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-medium">Upload design</h2>
        <form action={uploadSweetohDesignAction} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-700">Name</span>
            <input
              name="name"
              required
              className="w-full rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-700">Notes</span>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-700">File</span>
            <input name="file" type="file" required className="w-full text-sm" />
          </label>
          <button
            type="submit"
            className="rounded bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900"
          >
            Upload draft design
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-medium">Your uploads</h2>
        </div>
        {uploads.length === 0 ? (
          <p className="px-6 py-8 text-sm text-neutral-500">No uploads yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {uploads.map((asset) => (
              <li key={asset.id} className="px-6 py-4">
                <p className="font-medium">{asset.name}</p>
                <p className="mt-1 text-sm text-neutral-500">
                  {asset.status} · {new Date(asset.createdAt).toLocaleString()}
                </p>
                {asset.notes ? (
                  <p className="mt-1 text-sm text-neutral-600">{asset.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
