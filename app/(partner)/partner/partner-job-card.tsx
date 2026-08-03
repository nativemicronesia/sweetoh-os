import {
  getStudioProjectImages,
  partitionStudioProjectImagesByJobRole,
} from "@/lib/domains/studio/images";
import {
  isCustomerCustomizationRequest,
  parseCustomerRequestNotes,
} from "@/lib/domains/studio/customer-request";
import {
  formatStudioProjectStatus,
  type StudioProjectStatus,
} from "@/lib/domains/studio/types";
import { PartnerProductionUploadForm } from "./components/partner-production-upload-form";
import {
  JobCapturedRequestPanel,
  JobProductionPanel,
  JobReferencePanel,
} from "@/app/components/studio-project-panels";
import { StudioProjectImages } from "@/lib/domains/studio/components/studio-project-images";

const PRODUCTION_JOB_STATUSES = new Set<StudioProjectStatus>([
  "approved",
  "in_production",
]);

type PartnerJobCardProps = {
  job: {
    id: string;
    name: string;
    notes: string | null;
    status: StudioProjectStatus;
    updatedAt: Date;
  };
  imageSet: Awaited<ReturnType<typeof getStudioProjectImages>>;
  uploadProductionImageAction: (projectId: string, formData: FormData) => Promise<void>;
};

export function PartnerJobCard({
  job,
  imageSet,
  uploadProductionImageAction,
}: PartnerJobCardProps) {
  const parsed = parseCustomerRequestNotes(job.notes);
  const jobImages = partitionStudioProjectImagesByJobRole(imageSet);
  const canUploadProduction = PRODUCTION_JOB_STATUSES.has(job.status);

  return (
    <li className="space-y-4 px-6 py-6" style={{ borderColor: "var(--so-border)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium" style={{ color: "var(--so-cream)" }}>
            {job.name}
          </p>
          {isCustomerCustomizationRequest(job.notes) ? (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                background: "rgba(201,168,76,0.15)",
                color: "var(--so-gold)",
              }}
            >
              Storefront
            </span>
          ) : null}
        </div>
        <span className="text-sm" style={{ color: "var(--so-cream-dim)" }}>
          {formatStudioProjectStatus(job.status)}
        </span>
      </div>

      <JobCapturedRequestPanel
        email={parsed.email}
        contact={parsed.contact}
        prompt={parsed.prompt}
      />

      <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
        Updated {new Date(job.updatedAt).toLocaleString()}
      </p>

      <JobReferencePanel images={jobImages.reference} />

      <JobProductionPanel images={jobImages.production}>
        {canUploadProduction ? (
          <PartnerProductionUploadForm
            action={uploadProductionImageAction.bind(null, job.id)}
          />
        ) : (
          <p className="mt-3 text-xs" style={{ color: "var(--so-cream-dim)" }}>
            This job is no longer open for production uploads.
          </p>
        )}
      </JobProductionPanel>

      {jobImages.mockup.length > 0 ? (
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <StudioProjectImages images={jobImages.mockup} title="Mockups" />
        </section>
      ) : null}
    </li>
  );
}
