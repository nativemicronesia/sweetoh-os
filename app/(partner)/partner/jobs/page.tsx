import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getStudioProjectImages } from "@/lib/domains/studio/images";
import {
  isPartnerProductionJobStatus,
  listCustomerCustomizationRequests,
} from "@/lib/domains/studio";
import { uploadApprovedJobImageAction } from "../actions/studio";
import { PartnerJobCard } from "../partner-job-card";

type PartnerProductionQueuePageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function PartnerProductionQueuePage({
  searchParams,
}: PartnerProductionQueuePageProps) {
  const session = await requirePartnerWorkspace();
  const query = await searchParams;

  const requests = await listCustomerCustomizationRequests(session.ventureId);
  const productionJobs = requests.filter((project) =>
    isPartnerProductionJobStatus(project.status),
  );

  const jobsWithImages = await Promise.all(
    productionJobs.map(async (project) => ({
      project,
      images: await getStudioProjectImages({
        ventureId: session.ventureId,
        projectId: project.id,
      }),
    })),
  );

  return (
    <div className="space-y-6">
      {query.error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {query.error}
        </p>
      ) : null}
      {query.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {query.success}
        </p>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold">Production queue</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Sweet&apos;Oh AI jobs approved for production. Work stays in this queue
          while status is Approved or In Production.
        </p>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white">
        {jobsWithImages.length === 0 ? (
          <p className="px-6 py-10 text-sm text-neutral-500">
            No production jobs yet. When an owner approves a storefront request,
            it will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {jobsWithImages.map(({ project, images }) => (
              <PartnerJobCard
                key={project.id}
                job={project}
                imageSet={images}
                uploadProductionImageAction={uploadApprovedJobImageAction}
              />
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-neutral-500">
        Status updates are managed by the owner on Sweet&apos;Oh AI jobs.
      </p>
    </div>
  );
}
