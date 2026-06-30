import type { ReactNode } from "react";
import { StudioProjectImages } from "@/lib/domains/studio/components/studio-project-images";
import type { StudioProjectImage } from "@/lib/domains/studio/images";

type JobCapturedRequestPanelProps = {
  email: string | null;
  contact: string | null;
  prompt: string | null;
  submittedAt?: Date | string | null;
};

export function JobCapturedRequestPanel({
  email,
  contact,
  prompt,
  submittedAt,
}: JobCapturedRequestPanelProps) {
  return (
    <section
      className="rounded-lg border border-sky-200 bg-sky-50 p-6"
      aria-label="Captured request"
    >
      <h2 className="text-lg font-medium text-sky-950">Captured request</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="font-medium text-sky-900">Email</dt>
          <dd className="mt-0.5 text-sky-950">{email ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-sky-900">Contact</dt>
          <dd className="mt-0.5 text-sky-950">{contact ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-sky-900">What they want to create</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-sky-950">
            {prompt ?? "—"}
          </dd>
        </div>
        {submittedAt ? (
          <div>
            <dt className="font-medium text-sky-900">Submitted</dt>
            <dd className="mt-0.5 text-sky-950">
              {new Date(submittedAt).toLocaleString()}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

type JobReferencePanelProps = {
  images: StudioProjectImage[];
};

export function JobReferencePanel({ images }: JobReferencePanelProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-lg border border-neutral-200 bg-white p-6"
      aria-label="Customer reference"
    >
      <StudioProjectImages images={images} title="Customer reference" />
    </section>
  );
}

type JobProductionPanelProps = {
  images: StudioProjectImage[];
  children?: ReactNode;
};

export function JobProductionPanel({ images, children }: JobProductionPanelProps) {
  return (
    <section
      className="rounded-lg border border-neutral-200 bg-white p-6"
      aria-label="Production images"
    >
      <h2 className="text-lg font-medium">Production images</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Upload and review production photos for this job.
      </p>
      {images.length > 0 ? (
        <div className="mt-4">
          <StudioProjectImages images={images} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-neutral-500">No production images yet.</p>
      )}
      {children}
    </section>
  );
}

type JobInternalNotesPanelProps = {
  internalNotes: string | null;
  saveAction: (formData: FormData) => Promise<void>;
};

export function JobInternalNotesPanel({
  internalNotes,
  saveAction,
}: JobInternalNotesPanelProps) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-lg font-medium text-amber-950">Internal notes</h2>
      <p className="mt-1 text-sm text-amber-900/80">
        Staff only — production instructions, approval context, or follow-ups.
        Not shown to customers or partners.
      </p>
      <form action={saveAction} className="mt-4 space-y-3">
        <textarea
          name="internalNotes"
          rows={4}
          defaultValue={internalNotes ?? ""}
          placeholder="e.g. Use watercolor style; confirm child's name spelling before print."
          className="w-full rounded border border-amber-300 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100"
        >
          Save internal notes
        </button>
      </form>
    </section>
  );
}
