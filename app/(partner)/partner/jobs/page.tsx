import Link from "next/link";
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
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--so-rose-dim)",
            background: "rgba(196,103,122,0.12)",
            color: "var(--so-cream)",
          }}
          role="alert"
        >
          {query.error}
        </p>
      ) : null}
      {query.success ? (
        <p
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--so-gold-dim)",
            background: "rgba(201,168,76,0.1)",
            color: "var(--so-cream)",
          }}
        >
          {query.success}
        </p>
      ) : null}

      <div>
        <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
          <Link href="/partner/studio" className="hover:underline" style={{ color: "var(--so-cream)" }}>
            Studio
          </Link>
          {" / "}
          Print
        </p>
        <h1 className="mt-2 text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          Print
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Jobs for your printers — heat press, DTG, sublimation, or whatever you run.
        </p>
      </div>

      <section
        className="rounded-xl border"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        {jobsWithImages.length === 0 ? (
          <p className="px-6 py-10 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            Nothing on the press yet. When a job is ready for production, it shows
            up here.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--so-border)" }}>
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
    </div>
  );
}
